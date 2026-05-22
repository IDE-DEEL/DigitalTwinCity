## UV Setup
Eerst moet je uv installeren met behulp van pip of van de microsoft powershell.
Website url: https://docs.astral.sh/uv/getting-started/installation/

Dan hoeft je alleen de onderste command line uit te voeren om uv de .venv aan te maken
met alle dependencies erin.

command: uv sync

Indien nodig moet je ook een nieuwe interpreter te voegen en dan klik je op Add New Interpreter -> Add Local Interpreter -> Select Existing Environment -> type uv -> Als environment path de python.exe file in de .venv  

## Running local
command: uv run ./main.py