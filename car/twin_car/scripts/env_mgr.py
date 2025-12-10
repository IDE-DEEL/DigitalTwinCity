"""
----
Environment manager script die controleert of alle environment variabelen ingesteld zijn.
----

Dit script wordt tijdens het compilen automatisch aangeroepen dus dit hoef je niet expliciet te doen. (Mag en kan wel)

Wees wel alert dat er geen controles zitten op dat wat je invult logisch is. Als je "Boterkoek" als server IP adres meegeeft wordt dit geaccepteerd.
Input sanitation zou dieper geïmplementeerd kunnen worden maar voor nu heb je alleen jezelf er mee als programmeur als je iets verkeerds meegeeft
want dan gaat je software niet werken.
"""
Import("env")
import os
import sys

# Vereiste environment variabelen. Als je meer wilt toevoegen moet je deze lijst uitbreiden.
REQUIRED = [
    {"name": "DEEL_WIFI_SSID", "prompt": "Wi-Fi SSID"},
    {"name": "DEEL_WIFI_PSK", "prompt": "Wi-Fi Password"},
    {"name": "DEEL_SERVER_IP", "prompt": "MQTT Server Host/IP"},
    {"name": "DEEL_SERVER_PSK", "prompt": "MQTT TLS-PSK (hex)"}
]

# Pad naar .env bestand (relatief aan project root)
PROJECT_DIR = env.get("PROJECT_DIR")
ENV_FILE = os.path.join(PROJECT_DIR, ".env")


def load_env_file():
    """Laad de variabelen uit .env file"""
    
    # Als er geen bestand gevonden word gewoon een lege dict returnen zodat het duidelijk is dat er niks geset is.
    if not os.path.exists(ENV_FILE):
        return {}
    
    values = {}
    with open(ENV_FILE, 'r', encoding='utf-8') as f:
        # Loop door alle regels van het bestand en parse de waarden er uit.
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                values[key.strip()] = value.strip()
    return values


def save_env_file(values):
    """Sla de variabelen op in .env file"""
    with open(ENV_FILE, 'w', encoding='utf-8') as f:
        for key, value in values.items():
            f.write(f"{key}={value}\n")


def check_and_prompt():
    """Controleer of alle variabelen zijn ingesteld en prompt voor aanvulling waar nodig"""
    current_values = load_env_file()
    missing = []
    
    # Check of en zoja welke variabelen er missen
    for var in REQUIRED:
        if var["name"] not in current_values or not current_values[var["name"]]:
            missing.append(var)
    
    if not missing:
        print("All required environment variables are set in .env")
        # Print alle variabelen maar censureer de wachtwoord achtige variabelen
        for var in REQUIRED:
            value = current_values[var["name"]]
            env.Append(CPPDEFINES=[(var["name"], env.StringifyMacro(value))],)
            if "password" in var["name"].lower() or "psk" in var["name"].lower():
                print(f"  {var['name']}: *****")
            else:
                print(f"  {var['name']}: {value}")
        return True
    
    # Als we op dit punt in de functie komen is de configuratie niet compleet dus moet er om aanvullig gevraagd worden.
    # Dat moet even mooi geformat worden zodat het goed inblend in de platformio build flow.
    print("\n" + "="*60)
    print("CONFIGURATION REQUIRED")
    print("="*60)
    print(f"\n.env file location: {ENV_FILE}")
    print("\nMissing variables:")
    for var in missing:
        print(f"  - {var['name']}: {var['prompt']}")
    
    print("\n" + "="*60)
    
    # Voor elk variabel dat mist wordt er gevraagd om deze aan te vullen
    for var in missing:
        print(f"Enter {var['prompt']}:")
        value = input()
        current_values[var["name"]] = value
    
    # Sla de nieuwe waarden op in het bestand en loop recursief door deze functie tot alles op orde is. 
    # In principe zou dit maar 1x kunnen gebeuren behalve als je .env handmatig tijdens runtime wijzigt.
    save_env_file(current_values)
    print("Updated .env file with missing variables.")
    check_and_prompt()


# Run de check
print("\n[env_mgr] Checking environment configuration...")
print(f"[env_mgr] Using python installation from {sys.prefix} and script was called by {sys.executable}")
check_and_prompt()