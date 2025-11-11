# Ollama Integration Guide

This document describes how to use Ollama as an LLM backend for the `azor-chatdog-ts` project.

## What is Ollama?

[Ollama](https://ollama.com) is a tool for running large language models locally. It provides a simple REST API for interacting with various open-source models like Llama 3.2, Mistral, Phi, and many others.

### Benefits of Using Ollama

- **Privacy**: Models run entirely on your local machine - no data is sent to external servers
- **No API costs**: Run unlimited conversations without paying per token
- **Offline capability**: Works without an internet connection (after initial model download)
- **Model variety**: Easy access to dozens of open-source models
- **Fast switching**: Change models instantly without reconfiguration

## Prerequisites

### 1. Install Ollama

Visit [https://ollama.com](https://ollama.com) and download the installer for your operating system:

- **macOS**: Download and run the `.dmg` installer
- **Linux**: Run `curl -fsSL https://ollama.com/install.sh | sh`
- **Windows**: Download and run the Windows installer

### 2. Start Ollama Server

After installation, start the Ollama server:

```bash
ollama serve
```

The server will start on `http://localhost:11434` by default.

### 3. Pull a Model

Download a model you want to use. Popular choices include:

```bash
# Llama 3.2 (3B parameters - fast and efficient)
ollama pull llama3.2

# Llama 3.1 (8B parameters - more capable)
ollama pull llama3.1:8b

# Mistral (7B parameters - excellent performance)
ollama pull mistral

# Phi 3 (3.8B parameters - good for resource-constrained systems)
ollama pull phi3
```

To see all available models, visit [https://ollama.com/library](https://ollama.com/library).

## Configuration

### Environment Variables

Create or update your `.env` file with the following Ollama-specific variables:

```bash
# Set the engine to OLLAMA
ENGINE=OLLAMA

# Model name (must match a model you've pulled with Ollama)
OLLAMA_MODEL_NAME=llama3.2

# Ollama server URL (defaults to http://localhost:11434)
OLLAMA_BASE_URL=http://localhost:11434

# Request timeout in milliseconds (defaults to 30000)
OLLAMA_TIMEOUT=30000

# Sampling parameters (control model output randomness and diversity)
OLLAMA_TEMPERATURE=0.8    # Range: 0-2 (default: 0.8, lower = more focused, higher = more creative)
OLLAMA_TOP_P=0.9          # Range: 0-1 (default: 0.9, nucleus sampling threshold)
OLLAMA_TOP_K=40           # Range: 1+ (default: 40, limits vocabulary to top K tokens)
```

### Configuration Options Explained

- **`ENGINE`**: Must be set to `OLLAMA` to use the Ollama client
- **`OLLAMA_MODEL_NAME`**: The name of the model as shown in `ollama list`
- **`OLLAMA_BASE_URL`**: URL where Ollama server is running (use default unless you've configured Ollama differently)
- **`OLLAMA_TIMEOUT`**: Maximum time to wait for model responses (in milliseconds)

#### Sampling Parameters

These parameters control how the model generates responses:

- **`OLLAMA_TEMPERATURE`**: Controls randomness in responses

  - Lower values (0.1-0.5): More focused, deterministic, and conservative
  - Medium values (0.6-0.9): Balanced creativity and coherence (recommended)
  - Higher values (1.0-2.0): More creative and diverse, but potentially less coherent

- **`OLLAMA_TOP_P`**: Nucleus sampling - considers only tokens with cumulative probability P

  - Lower values (0.1-0.5): More focused responses
  - Medium values (0.6-0.9): Balanced (recommended)
  - Higher values (0.9-1.0): More diverse vocabulary

- **`OLLAMA_TOP_K`**: Limits the model to choose from the top K most likely tokens
  - Lower values (10-20): More focused vocabulary
  - Medium values (30-50): Balanced (recommended)
  - Higher values (60+): More diverse word choices

## Usage

### Starting a Chat Session

Once configured, simply run the application:

```bash
npm run dev
```

Or with the built version:

```bash
npm start
```

The application will automatically:

1. Connect to your Ollama server
2. Verify the connection
3. Start a chat session with your configured model

### Checking Available Models

To see which models you have available locally:

```bash
ollama list
```

### Switching Models

To use a different model, either:

1. **Update `.env` file**: Change `OLLAMA_MODEL_NAME` to a different model
2. **Pull new model first**: Make sure to run `ollama pull <model-name>` before using it

## Troubleshooting

### Connection Issues

**Error**: `Nie można połączyć się z serwerem Ollama`

**Solutions**:

- Ensure Ollama is running: `ollama serve`
- Check if the server is accessible: `curl http://localhost:11434/api/tags`
- Verify `OLLAMA_BASE_URL` in `.env` matches your Ollama server address

### Model Not Found

**Error**: Model not available or request fails

**Solutions**:

- Verify you've pulled the model: `ollama list`
- Pull the model if missing: `ollama pull <model-name>`
- Check that `OLLAMA_MODEL_NAME` exactly matches the model name from `ollama list`

### Slow Responses

**Solutions**:

- Use a smaller model (e.g., `llama3.2` instead of `llama3.1:70b`)
- Increase `OLLAMA_TIMEOUT` in `.env`
- Ensure your system has adequate resources (RAM and CPU/GPU)
- Check Ollama resource usage: some models require significant RAM (16GB+ for 13B+ models)

### Timeout Errors

**Error**: Request timeout during generation

**Solutions**:

- Increase `OLLAMA_TIMEOUT` in `.env` (e.g., to `60000` for 60 seconds)
- Use a faster/smaller model
- Ensure Ollama isn't under heavy load from other processes

## Implementation Details

### Architecture

The Ollama integration consists of two main components:

1. **`OllamaClient`** (`src/llm/ollamaClient.ts`): Manages connection to Ollama server and configuration
2. **`OllamaChatSession`** (`src/llm/ollamaClient.ts`): Handles individual chat sessions and message history

### API Communication

The client communicates with Ollama via its REST API:

- **Endpoint**: `POST /api/chat`
- **Format**: JSON with messages array
- **Streaming**: Currently disabled (uses `stream: false`)

### Token Counting

Ollama returns token counts in the response metadata:

- `prompt_eval_count`: Tokens in the prompt
- `eval_count`: Tokens in the response

For token estimation, the client uses a fallback approximation of ~4 characters per token.

### History Management

Chat history is converted between two formats:

- **Internal format**: Used by azor-chatdog (role: 'user'|'model')
- **Ollama format**: Used by Ollama API (role: 'user'|'assistant'|'system')

## Comparison with Other Backends

| Feature            | Ollama    | Gemini           | Local LLaMA |
| ------------------ | --------- | ---------------- | ----------- |
| **Privacy**        | ✅ Local  | ❌ Cloud         | ✅ Local    |
| **Cost**           | ✅ Free   | 💰 Pay per token | ✅ Free     |
| **Setup**          | ⚡ Easy   | ⚡ Very Easy     | 🔧 Complex  |
| **Performance**    | 🚀 Fast   | 🚀 Very Fast     | 🐌 Varies   |
| **Model Variety**  | ✅ Many   | ❌ Fixed         | ✅ Any GGUF |
| **Resource Usage** | 📊 Medium | 📊 None (cloud)  | 📊 High     |

## Recommended Models

### For Development/Testing

- **`llama3.2`** (3B): Fast responses, low resource usage
- **`phi3`** (3.8B): Excellent for coding tasks

### For General Use

- **`llama3.1:8b`** (8B): Best balance of speed and quality
- **`mistral`** (7B): Great general-purpose model

### For Best Quality (requires more resources)

- **`llama3.1:70b`** (70B): Highest quality, requires 40GB+ RAM
- **`mixtral`** (47B): Excellent reasoning capabilities

## Additional Resources

- [Ollama Documentation](https://github.com/ollama/ollama/blob/main/docs/README.md)
- [Ollama Model Library](https://ollama.com/library)
- [Ollama API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Model Comparison](https://ollama.com/library)

## Support

If you encounter issues with the Ollama integration, please check:

1. Ollama server is running (`ollama serve`)
2. Model is downloaded (`ollama list`)
3. Configuration in `.env` is correct
4. Server is accessible at the configured URL
