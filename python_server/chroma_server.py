import argparse
import subprocess

def run_chroma_server():
    parser = argparse.ArgumentParser(description='Run ChromaDB server')
    parser.add_argument('--host', type=str, default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--path', type=str, required=True)

    args = parser.parse_args()

    try:
        subprocess.run([
            "chroma", "run",
            "--host", args.host,
            "--port", str(args.port),
            "--path", args.path
        ], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running ChromaDB server: {e}")
        exit(1)

if __name__ == "__main__":
    run_chroma_server()
