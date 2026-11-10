import { describe, expect, it } from "vitest";

import {
  formatReport,
  runTasks,
  spawnTask,
  verifyFailed,
  verifyTasks,
} from "../scripts/verify.mjs";

const capacities = { cpu: 12, browser: 1 };
const tasks = verifyTasks(capacities.cpu, capacities.browser);

describe("the verify runner", () => {
  it("keeps the task-record contract and threads caching inputs through", async () => {
    const [task] = tasks;
    let options;
    await runTasks([task], {
      cpuSlots: capacities.cpu,
      browserSlots: capacities.browser,
      noCache: true,
      executeTask: async (_task, received) => {
        options = received;
        return { exitCode: 0, output: "", durationMs: 10 };
      },
    });

    expect(Object.keys(task)).toEqual(["name", "run", "needs", "inputs", "slots"]);
    expect(options).toMatchObject({ noCache: true, inputs: task.inputs });
  });

  it("serializes browser work when the pool is fully charged", async () => {
    const shot = verifyTasks(12, 3).find(({ name }) => name === "shot");
    const browserTasks = [
      { ...shot, name: "first", needs: [] },
      { ...shot, name: "second", needs: [] },
    ];
    const active = [];
    let mostActive = 0;

    await runTasks(browserTasks, {
      cpuSlots: 12,
      browserSlots: 3,
      executeTask: async (task, { browserSlots }) => {
        active.push(browserSlots);
        mostActive = Math.max(
          mostActive,
          active.reduce((total, slots) => total + slots, 0),
        );
        await new Promise((resolve) => setTimeout(resolve, 5));
        active.splice(active.indexOf(browserSlots), 1);
        return { exitCode: 0, output: "", durationMs: 10 };
      },
    });

    expect(mostActive).toBe(3);
  });

  it("charges worker pools to the CPU budget", () => {
    const fourCore = verifyTasks(4, 3);

    expect(fourCore.find(({ name }) => name === "test")?.slots.cpu).toBe(2);
    expect(fourCore.find(({ name }) => name === "shot")?.slots).toEqual({
      cpu: 2,
      browser: 2,
    });
    // The browser and test pools divide the available CPU capacity.
    for (const [cpu, browser] of [
      [4, 3],
      [12, 6],
      [2, 1],
    ]) {
      const scheduled = verifyTasks(cpu, browser);
      const test = scheduled.find(({ name }) => name === "test")?.slots.cpu;
      const shot = scheduled.find(({ name }) => name === "shot")?.slots.cpu;

      expect(test).toBeGreaterThanOrEqual(1);
      expect(test + shot).toBe(cpu);
      expect(shot).toBeLessThanOrEqual(browser);
      expect(shot).toBeLessThanOrEqual(4);
    }
  });

  it("asks Vitest for exactly the workers it was charged for", () => {
    for (const [cpu, browser] of [
      [4, 3],
      [12, 6],
      [2, 1],
    ]) {
      const test = verifyTasks(cpu, browser).find(({ name }) => name === "test");

      expect(test.run).toContain(`--maxWorkers=${test.slots.cpu}`);
    }
  });

  it("keeps only the real build dependencies and reusable checks", () => {
    expect(tasks.map(({ name }) => name)).toEqual([
      "typecheck",
      "lint",
      "format:check",
      "docs:check",
      "test",
      "build",
      "shot",
    ]);
    expect(tasks.find(({ name }) => name === "shot").needs).toEqual(["build"]);
    expect(tasks.filter(({ needs }) => needs.length === 0)).toHaveLength(6);
  });

  it("tells a task how much of the machine it was given", async () => {
    const test = tasks.find(({ name }) => name === "test");
    const result = await spawnTask(
      {
        ...test,
        run: [
          process.execPath,
          "-e",
          "process.stdout.write(`${process.env.VERIFY_CPU_SLOTS}/${process.env.VERIFY_BROWSER_SLOTS}`)",
        ],
      },
      { noCache: false },
    );

    expect(result.exitCode).toBe(0);
    expect(result.output).toBe(`${test.slots.cpu}/${test.slots.browser}`);
  });

  it.each(tasks.map(({ name }) => [name]))("fails when %s alone fails", async (failedName) => {
    const results = await runTasks(tasks, {
      cpuSlots: capacities.cpu,
      browserSlots: capacities.browser,
      executeTask: async ({ name }) => ({
        exitCode: name === failedName ? 1 : 0,
        output: `${name} output`,
        durationMs: 10,
      }),
    });

    expect(verifyFailed(results)).toBe(true);
    expect(results.find(({ name }) => name === failedName)?.status).toBe("failed");
    expect(formatReport(results, capacities)).toContain(`FAIL  ${failedName}`);
  });

  it("prints task output in task order even when completion order differs", async () => {
    const completed = [];
    const results = await runTasks(tasks.slice(0, 4), {
      cpuSlots: 4,
      browserSlots: 1,
      executeTask: async ({ name }) => {
        await new Promise((resolve) => setTimeout(resolve, name === "typecheck" ? 10 : 0));
        completed.push(name);
        return { exitCode: 0, output: `${name} output`, durationMs: 10 };
      },
    });
    const report = formatReport(results, { cpu: 4, browser: 1 }, { verbose: true });

    expect(completed[0]).not.toBe("typecheck");
    expect(report.indexOf("typecheck output")).toBeLessThan(report.indexOf("lint output"));
    expect(report.indexOf("lint output")).toBeLessThan(report.indexOf("format:check output"));
  });

  it("stops scheduling after a failure and keeps results from running work", async () => {
    const smallTasks = tasks.slice(0, 3);
    const started = [];
    const results = await runTasks(smallTasks, {
      cpuSlots: 2,
      browserSlots: 1,
      executeTask: async ({ name }) => {
        started.push(name);
        await new Promise((resolve) => setTimeout(resolve, name === "typecheck" ? 0 : 10));
        return { exitCode: name === "typecheck" ? 1 : 0, output: name, durationMs: 10 };
      },
    });

    expect(started).toEqual(["typecheck", "lint"]);
    expect(results.map(({ status }) => status)).toEqual(["failed", "passed", "skipped"]);
  });

  it("names the automatic fix for a formatting failure", () => {
    const report = formatReport(
      [
        {
          name: "format:check",
          status: "failed",
          output: "bad format",
          durationMs: 10,
        },
      ],
      capacities,
    );

    expect(report).toContain("fix with: npm run format");
  });

  it("prints one line when every task passes unless verbose output was requested", () => {
    const results = tasks.map(({ name }) => ({
      name,
      status: "passed",
      output: "",
      durationMs: 10,
    }));
    const output = formatReport(results, capacities);

    expect(output).toBe("Verify passed.\n");
    expect(Buffer.byteLength(output)).toBeLessThan(32);
    expect(output.trim().split("\n")).toHaveLength(1);
    expect(formatReport(results, capacities, { verbose: true })).toContain("0.0s");
  });

  it("does not wrap empty output in a verbose task section", () => {
    const report = formatReport(
      [
        {
          name: "typecheck",
          status: "passed",
          output: "",
          durationMs: 10,
        },
      ],
      capacities,
      { verbose: true },
    );

    expect(report).not.toContain("Task output");
    expect(report).not.toContain("(no output)");
  });
});
