


## Installation

1.  **Creation & Setup Steps**
    ```
    py -3.9 -m venv venv
    py -3.9 -m pip install chromadb pyinstaller
    py -3.9 -m pip freeze > requirements.txt
    ```


1.  **Create a new installer for electron to use**
    ```
    pyinstaller --onefile --name chroma_server chroma_server.py
    ```
