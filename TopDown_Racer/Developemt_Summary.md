# Development Summary

##  Development Process

1. Import assets  
2. Research car mechanics  
3. Implement player car logic  
4. Configure player car stats (max speed, steer strength)  
5. Implement AI car based on player logic  
6. Implement UI  
7. Build the map  
8. Optimize models (map, cars)  
9. Bake lightmaps  
10. Add smoke VFX  
11. Add SFX  
12. Build and fix bugs

---

##  Problems I Solved

- Instead of using **Wheel Colliders** to move the car — which proved to be unstable and couldn’t be resolved at this stage — I used **Rigidbody** to control the car's movement (by applying force) and steering (by applying torque). This approach provided better stability for now.

---

##  Things I Learned During Development

- Learned more about **Luna's limitations**, especially regarding physics systems like **Wheel Colliders**.  
- Discovered that **reducing vertices** too much can sometimes lead to **broken lightmaps**.


