from requests import post, RequestException
import base64


def generate_response(prompt: str) -> str:
    # sends a text prompt to the normal Qwen 2.5 7B model and returns the model's answer
    try:
        # url = "http://127.0.0.1:11434/api/generate"
        url = "http://127.0.0.1:11434/v1/chat/completions"
        response = post(
            url,
            # json={
            #     "model": "qwen2.5:7b",
            #     "prompt": prompt,
            #     "stream": False,
            # },
            json={
                "model": "qwen2.5:7b",
                "messages": [
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                "stream": False,
                # wait until the answer is complete to send it
            },

            timeout=300,
        )
        response.raise_for_status() #raise an exception if not 200 OK
        # return response.json()["response"]
        return response.json()["choices"][0]["message"]["content"]
    except RequestException as error:
        print(f"Actual error: {error}")
        raise RuntimeError(
            "Failed to communicate with the local Ollama server."
        ) from error
    
def generate_code_response(prompt: str) -> str:
    try:
        url = "http://127.0.0.1:11434/v1/chat/completions"
        response = post(
            url,
            json={
                "model": "qwen2.5-coder:7b",
                "messages": [
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                "stream": False,
            },
            timeout=300,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except RequestException as error:
        print(f"Actual error: {error}")
        raise RuntimeError(
            "Failed to communicate with the local Ollama server."
        ) from error

def generate_vision_response(image_bytes: bytes, prompt: str) -> str:
    # receive image and prompt saying what to do with that image
    try:
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        # convert the img to base64 before sending it to ollama
        # bc cannot send raw binary data directly -> need to convert the raw binary into a text representation
        # -> the img is a long string of text that can be placed in json
        
        if image_bytes.startswith(b"\x89PNG"):
            # image format starts with a unique sequence of bytes called a file signature
            mime_type = "image/png"
        elif image_bytes.startswith(b"RIFF") and b"WEBP" in image_bytes[:16]:
            mime_type = "image/webp"
        else:
            mime_type = "image/jpeg"

        url = "http://127.0.0.1:11434/v1/chat/completions"
        response = post(
            url,
            json={
                "model": "qwen2.5vl:7b",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt,
                            },
                            {
                                "type": "image_url",
                                "image_url": (
                                    f"data:{mime_type};base64,{image_base64}"
                                ),
                            },
                        ],
                    }
                ],
                "stream": False,
            },
            timeout=600,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except RequestException as error:
        print(f"Actual error: {error}")
        raise RuntimeError( "Failed to communicate with the local Ollama vision model.") from error
