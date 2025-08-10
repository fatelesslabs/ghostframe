# Commit Message Guidelines

This project follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. This leads to more readable messages that are easy to follow when looking through the project history.

## Format

Each commit message consists of a **header**, a **body** and a **footer**.

```
<type>(<scope>): <short summary>

<optional body>

<optional footer>
```

### Type

Must be one of the following:

*   **feat**: A new feature
*   **fix**: A bug fix
*   **docs**: Documentation only changes
*   **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
*   **refactor**: A code change that neither fixes a bug nor adds a feature
*   **perf**: A code change that improves performance
*   **test**: Adding missing tests or correcting existing tests
*   **build**: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
*   **ci**: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)
*   **chore**: Other changes that don't modify src or test files
*   **revert**: Reverts a previous commit

### Scope

The scope should be the name of the npm package affected (as perceived by person reading the changelog generated from commit messages).

The following is a list of supported scopes:

*   **app**: The main application
*   **ui**: The user interface
*   **electron**: The Electron main process
*   **services**: The Electron services
*   **hooks**: The React hooks
*   **audio**: The audio capture and processing
*   **automation**: The browser automation
*   **ai**: The AI service integration

### Summary

The summary contains a succinct description of the change:

*   use the imperative, present tense: "change" not "changed" nor "changes"
*   don't capitalize the first letter
*   no dot (.) at the end

### Body

Just as in the **summary**, use the imperative, present tense: "change" not "changed" nor "changes". The body should include the motivation for the change and contrast this with previous behavior.

### Footer

The footer should contain any information about **Breaking Changes** and is also the place to reference GitHub issues that this commit **Closes**.

**Breaking Change** section should start with the phrase "BREAKING CHANGE:" with a space or two newlines. The rest of the commit message is then the description of the change, justification and migration notes.
