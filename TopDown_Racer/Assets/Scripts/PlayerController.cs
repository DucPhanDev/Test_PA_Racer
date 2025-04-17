using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class PlayerController : MonoBehaviour
{
    public float acceleration = 20f;
    public float maxSpeed = 15f;
    public float turnSpeed = 60f;
    public float maxTurnAngle = 30f;

    private float currentTurnInput = 0f;
    private float currentTurnAngle = 0f;

    private Rigidbody rb;

    void Start()
    {
        rb = GetComponent<Rigidbody>();
        rb.constraints = RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationZ;
        rb.useGravity = false;
    }

    void Update()
    {
        HandleInput();
    }

    void FixedUpdate()
    {
        Turn();
        Move();
    }

    void HandleInput()
    {
        currentTurnInput = Input.GetAxisRaw("Horizontal");
    }

    void Move()
    {

        Vector3 desiredVelocity = transform.forward * maxSpeed;
        rb.velocity = Vector3.Lerp(rb.velocity, desiredVelocity, acceleration * Time.fixedDeltaTime);
    }

    void Turn()
    {
   
        currentTurnAngle += currentTurnInput * turnSpeed * Time.fixedDeltaTime;
        currentTurnAngle = Mathf.Clamp(currentTurnAngle, -maxTurnAngle, maxTurnAngle);

        Quaternion targetRotation = Quaternion.Euler(0f, currentTurnAngle, 0f);
        rb.MoveRotation(targetRotation);
    }
}
