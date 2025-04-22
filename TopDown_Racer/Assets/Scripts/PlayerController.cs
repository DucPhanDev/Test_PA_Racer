using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using Luna;
public class PlayerController : MonoBehaviour
{
    [Header("Movement Settings")]
    public float constantForwardForce = 30f;
    [LunaPlaygroundField("Player Max Speed", 0, "Player Controls")]
    public float maxSpeed = 50f;
    [LunaPlaygroundField("Player Steer Strength", 1, "Player Controls")]
    public float steerStrength = 80f;
    public float brakeStrength = 30f;
    [Range(0f, 1f)]
    public float baseGrip = 0.98f;
    [Range(0f, 1f)]
    public float driftGripMultiplier = 0.7f;
    public float driftTorqueMultiplier = 1f;

    [Header("Rotation Limits")]
    [Range(0f, 140f)]
    public float maxRotationAngle = 45f;

    [Header("Rotation Limits")]
    private Rigidbody rb;
    private float steerAmount;
    private bool isBraking = false;
    private float currentGrip;
    private float initialYaw;

    [Header("Joystick")]
    [SerializeField] private Joystick joystick;

    [Header("Drift Kick Out Settings")]
    public float kickOutForce = 3000f;
    public float driftSpeedThreshold = 5f;
    public float driftSteerThreshold = 0.5f;
    void Awake()
    {
        rb = GetComponent<Rigidbody>();
        currentGrip = baseGrip;
    }

    void Start()
    {
        initialYaw = transform.eulerAngles.y;
    }

    void Update()
    {
        //if (!SystemManager.Instance.GameStarted || SystemManager.Instance.GameEnded)
        //    return;

        //steerAmount = -joystick.Horizontal;
        //ApplyForwardForce();
        //ApplySteering();
        //LimitRotation();
        //HandleDrift();
    }

    void FixedUpdate()
    {
        if (!SystemManager.Instance.GameStarted || SystemManager.Instance.GameEnded)
            return;

        steerAmount = -joystick.Horizontal;
        ApplyForwardForce();
        ApplySteering();
        LimitRotation();
        HandleDrift();
    }

    void ApplyForwardForce()
    {
        Vector3 forwardForce = transform.forward * constantForwardForce * Time.fixedDeltaTime;
        rb.AddForce(forwardForce, ForceMode.Force);

        if (rb.velocity.magnitude > maxSpeed)
        {
            rb.velocity = rb.velocity.normalized * maxSpeed;
        }
    }

    void ApplySteering()
    {
        float torque = steerAmount * steerStrength * Time.fixedDeltaTime;
        rb.AddTorque(transform.up * torque, ForceMode.Force);
    }

    void HandleDrift()
    {
        Vector3 rightVelocity = Vector3.Project(rb.velocity, transform.right);
        currentGrip = baseGrip;

        bool shouldDrift = Mathf.Abs(steerAmount) > driftSteerThreshold && rb.velocity.magnitude > driftSpeedThreshold;

        if (shouldDrift)
        {

            currentGrip *= driftGripMultiplier;


            rb.velocity -= rightVelocity * (1f - currentGrip);


            float driftTorque = steerAmount * steerStrength * driftTorqueMultiplier * Time.fixedDeltaTime;
            rb.AddTorque(transform.up * driftTorque, ForceMode.Force);


            Vector3 kickDirection = transform.right * steerAmount;
            rb.AddForce(kickDirection * kickOutForce * Time.fixedDeltaTime, ForceMode.Force);
        }


        rb.velocity -= rightVelocity * (1f - currentGrip);
        rb.angularVelocity *= currentGrip;
    }

    void LimitRotation()
    {
        float currentYaw = transform.eulerAngles.y;
        float deltaYaw = Mathf.DeltaAngle(initialYaw, currentYaw);

        if (Mathf.Abs(deltaYaw) > maxRotationAngle)
        {
            float clampedYaw = initialYaw + Mathf.Clamp(deltaYaw, -maxRotationAngle, maxRotationAngle);
            Vector3 clampedRotation = new Vector3(transform.eulerAngles.x, clampedYaw, transform.eulerAngles.z);
            rb.MoveRotation(Quaternion.Euler(clampedRotation));
            rb.angularVelocity = Vector3.zero;
        }
    }
}
