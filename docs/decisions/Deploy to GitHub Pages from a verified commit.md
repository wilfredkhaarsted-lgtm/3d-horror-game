# Deploy to GitHub Pages from a verified commit

A static app should not publish a broken push while CI is still deciding
whether it works. The deployment workflow waits for successful push CI on
`main`, then checks out that exact SHA rather than the branch's later tip.
Manual dispatch checks the same successful-CI requirement for its main SHA.

The build uses relative asset URLs: the same output works at the server root,
under a repository prefix, and in local browser checks. Production hosting
therefore does not need a different build configuration from verification.

Deployment uploads a build artifact to Pages. It does not commit generated
files to a branch or introduce tagged releases. A second clean build is cheap
and avoids privileged handling of another run's build artifacts.

The Pages source is an administrator-configured repository setting, not a
privilege the deployment token needs. Failed verification leaves the
previously published site available. Deployments are serialized rather than
cancelled midway.
