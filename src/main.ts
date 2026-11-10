import "./style.css";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("The page is missing its #app main element.");

const heading = document.createElement("h1");
heading.textContent = "Hello, world!";

const introduction = document.createElement("p");
introduction.textContent = "Your next static web app starts here.";

app.append(heading, introduction);
