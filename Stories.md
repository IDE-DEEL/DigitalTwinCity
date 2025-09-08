# Project Stories

## 📌 User Stories
(User-focused, describe functionality in terms of "As a [role], I want [goal], so that [benefit]")

1. **Website interface (ID 6)**
   - As a student, I want to adjust parameters via the website so that I can influence the simulation in real time.  
   - As a student, I want to follow the Leaphys in real time via the website so that I can monitor the system's behavior.  

2. **Website–database link (ID 7)**
   - As a student, I want the website to save simulation results in the database so that I can revisit and analyze past simulations.  
   - As a student, I want the website to exchange data with the cloud so that the system can be used from anywhere.  

3. **Database implementation (ID 5)**
   - As a student, I want the database to store messages so that data is not lost.  
   - As a student, I want the database to be accessible via the website so that I can work with real-time data.  

4. **Cloud setup (ID 4)**
   - As a student, I want the cloud to receive messages so that my system can communicate remotely.  

5. **Digital implementation (ID 3)**
   - As a student, I want a digital implementation of the system so that I can test and simulate without hardware.  

6. **Physical implementation (ID 2)**
   - As a user, I want the car to follow a line and give arrival signals so that I can simulate real-world logistics.  


## 📌 Learning Stories
(Focused on what the team needs to learn/understand to progress)

1. We need to learn which sensors are required for the physical car to follow the line effectively.  
2. We need to learn the best way to communicate between the hardware and the cloud.  
3. We need to learn how much data is necessary for smooth operation and storage.  
4. We need to learn how to make the website/simulation accessible from anywhere for students.  
5. We need to learn how to ensure cloud uptime and reliability (x%).  


## 📌 Enabler Stories
(Technical work that supports user stories but isn’t directly user-facing)

1. Set up the cloud infrastructure to enable message reception and uptime monitoring (ID 4).  
2. Develop and configure the database to support message storage and accessibility (ID 5).  
3. Implement the website–database integration layer so that data flows consistently (ID 7).  
4. Develop the digital twin (digital implementation) so it mirrors the physical setup (ID 3).  
5. Ensure documentation and code comments are in Dutch to support maintainability (ID 1.2).  


## 📌 Research Stories
(Investigations/experiments to reduce uncertainty)

1. Research and document which sensors are most suitable for the physical car to detect and follow lines.  
2. Research communication methods (e.g., Wi-Fi mesh, MQTT, HTTP, etc.) for efficient hardware-to-cloud communication.  
3. Research expected data volume and storage requirements to size the database and cloud services correctly.  
4. Research how to host the website/simulation in a way that it is globally available (e.g., cloud hosting, VPN, containers).  
5. Research best practices for real-time data visualization on the website.  

Test