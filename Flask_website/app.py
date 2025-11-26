#!/usr/bin/env python3 

from flask import Flask, request, render_template_string 

import paho.mqtt.client as mqtt 

 

MQTT_HOST = "127.0.0.1" 

MQTT_PORT = 1883 

 

HTML_PAGE = """ 

<!doctype html> 

<html> 

  <head> 

    <title>MQTT Test</title> 

  </head> 

  <body> 

    <h1>MQTT Publish Test</h1> 

    <form method="post" action="/publish"> 

      <label>Topic:</label><br> 

      <input type="text" name="topic" value="test/flask" size="40"><br><br> 

 

      <label>Payload:</label><br> 

      <textarea name="payload" rows="5" cols="40">{"hello":"from flask"}</textarea><br><br> 

 

      <input type="submit" value="Publish"> 

    </form> 

    {% if message %} 

      <p><b>{{ message }}</b></p> 

    {% endif %} 

  </body> 

</html> 

""" 

 

app = Flask(__name__) 

 

def publish_mqtt(topic: str, payload: str): 

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, 

                         client_id="flask-mqtt-test") 

    # Zelfde als test_mqtt.py: geen TLS, alleen localhost:1883 

    client.connect(MQTT_HOST, MQTT_PORT, keepalive=30) 

    result = client.publish(topic, payload, qos=0, retain=False) 

    result.wait_for_publish() 

    client.disconnect() 

 

@app.route("/", methods=["GET"]) 

def index(): 

    return render_template_string(HTML_PAGE) 

 

@app.route("/publish", methods=["POST"]) 

def publish(): 

    topic = request.form.get("topic") or "test/flask" 

    payload = request.form.get("payload") or "" 

 

    try: 

        publish_mqtt(topic, payload) 

        msg = f"Published to '{topic}' with payload: {payload}" 

    except Exception as e: 

        msg = f"FOUT bij publish: {e}" 

 

    return render_template_string(HTML_PAGE, message=msg) 

 

if __name__ == "__main__": 

    app.run(host="0.0.0.0", port=5000, debug=True) 