"""
Environment manager script that checks if all environment variables are set.


This script checks for required environment variables needed for the project to run.
If any are missing, it prompts the user to input the missing values and saves them to a .env file in the project root.
This script is called automatically during the PlatformIO build process and does not have to be called manually, although it is possible.

Be aware that there are no checks on the logic of what you input. If you provide "Boterkoek" as the server IP address, it will be accepted.
Input sanitation could be implemented more deeply, but for now, you only have yourself to blame as a programmer if you provide something incorrect
because then your software will not work.

"""
Import("env")
import os
import sys

## Required environment variables configuration. 
# Expand this list in case more variables are needed.
REQUIRED = [
    {"name": "DEEL_WIFI_SSID", "prompt": "Wi-Fi SSID"},
    {"name": "DEEL_WIFI_PSK", "prompt": "Wi-Fi Password"},
    {"name": "DEEL_SERVER_IP", "prompt": "MQTT Server Host/IP"},
    {"name": "DEEL_SERVER_PSK", "prompt": "MQTT TLS-PSK (hex)"}
]

## Path to .env file (relative to project root)
PROJECT_DIR = env.get("PROJECT_DIR")
## Path to .env file
ENV_FILE = os.path.join(PROJECT_DIR, ".env")


def load_env_file():
    """Load variables from .env file"""
    
    # If no file is found, just return an empty dict so it's clear that nothing is set.
    if not os.path.exists(ENV_FILE):
        return {}
    
    values = {}
    with open(ENV_FILE, 'r', encoding='utf-8') as f:
        # Loop through all lines of the file and parse the values.
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                values[key.strip()] = value.strip()
    return values


def save_env_file(values):
    """Save variables to .env file"""
    with open(ENV_FILE, 'w', encoding='utf-8') as f:
        for key, value in values.items():
            f.write(f"{key}={value}\n")


def check_and_prompt():
    """Check if all variables are set and prompt for input where needed"""
    current_values = load_env_file()
    missing = []
    
    # Check which variables are missing
    for var in REQUIRED:
        if var["name"] not in current_values or not current_values[var["name"]]:
            missing.append(var)
    
    if not missing:
        print("All required environment variables are set in .env")
        # Print all variables but censor password like variables
        for var in REQUIRED:
            value = current_values[var["name"]]
            env.Append(CPPDEFINES=[(var["name"], env.StringifyMacro(value))],)
            if "password" in var["name"].lower() or "psk" in var["name"].lower():
                print(f"  {var['name']}: *****")
            else:
                print(f"  {var['name']}: {value}")
        return True
    
    # If we reach this point in the function, the configuration is not complete, so additional input is required.
    # This should be nicely formatted so it blends well in the PlatformIO build flow.
    print("\n" + "="*60)
    print("CONFIGURATION REQUIRED")
    print("="*60)
    print(f"\n.env file location: {ENV_FILE}")
    print("\nMissing variables:")
    for var in missing:
        print(f"  - {var['name']}: {var['prompt']}")
    
    print("\n" + "="*60)
    
    # For each missing variable, prompt the user to input a value
    for var in missing:
        print(f"Enter {var['prompt']}:")
        value = input()
        current_values[var["name"]] = value
    
    # Save the new values to the file and recursively call this function until everything is in order.
    # In principle, this should only happen once unless you manually change the .env during runtime.
    save_env_file(current_values)
    print("Updated .env file with missing variables.")
    check_and_prompt()


# Run the check
print("\n[env_mgr] Checking environment configuration...")
print(f"[env_mgr] Using python installation from {sys.prefix} and script was called by {sys.executable}")
check_and_prompt()