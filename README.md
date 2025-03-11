# DOSSim

DOSSim is a browser-based platform where users can run standard DOS commands and generate simple DOS apps/games from natural language prompts, executed via js-dos, with a custom CMD-like interpreter for bidirectional communication.

## Features

- **DOS-like CLI Environment**: Run classic DOS commands like `CLS`, `DIR`, etc.
- **Generative Capabilities**: Create and run simple BASIC programs through natural language prompts
- **Real-time Interaction**: Bidirectional communication between JavaScript and the DOS environment
- **Streaming Response**: See code being generated in real-time as if it's being typed

## Example Commands

- `CLS` - Clear the screen
- `DIR` - List files in the virtual filesystem
- `HELP` - Show available commands
- `MARIO.BAS /no-koopas /play-as-princess` - Generate and run a Mario game with specified options

## Technologies Used

- **js-dos**: Emulation of DOS in the browser
- **GW-BASIC**: Programming language used for the custom CMD interpreter and generated programs
- **Async Generators**: Streaming the AI-generated code in real-time

## Local Development

1. Clone the repository
2. Open `index.html` in a web browser

Note: The current implementation uses a mock AI client. To integrate with a real AI API, modify the `MockAIClient` class with your preferred API implementation.

## License

See the [LICENSE](LICENSE) file for details.