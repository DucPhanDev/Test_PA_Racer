using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using Luna;
public class PlayerController : MonoBehaviour
{
    [Header("Movement Settings")]
     [LunaPlaygroundField("Player Acceleration", 0, "Player Controls")]
    public float constantForwardForce = 30f;
    [LunaPlaygroundField("Player Max Speed", 1, "Player Controls")]
    public float maxSpeed = 50f;
    [LunaPlaygroundField("Player Steer Strength", 2, "Player Controls")]
    public float steerStrength = 80f;
    public float brakeStrength = 30f;
    [Range(0f, 1f)]
    public float baseGrip = 0.98f;
    [Range(0f, 1f)]
    public float driftGripMultiplier = 0.7f;
    public float driftTorqueMultiplier = 1f;

    [Header("Rotation Limits")]
    [LunaPlaygroundFieldStep(1f)]
    [LunaPlaygroundField("Player Max Steer Angle", 3, "Player Controls")]
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

    [Header("Stuck Raycast Settings")]
    public float stuckRayLength = 2f;
    public float unstuckMoveDistance = 5f;
    public float raySpacing = 1f;
    public LayerMask obstacleMask;

    private float stuckRayCheckInterval = 0.5f;
    private float lastRayCheckTime = 0f;
    private float stuckDuration = 0f;
    public float maxStuckTime = 3f;

    private bool isBlocked;

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
        //CheckStuckWithRaycast();
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
        CheckStuckWithRaycast();
    }
    void CheckStuckWithRaycast()
    {

        if (Time.time - lastRayCheckTime < stuckRayCheckInterval)
            return;
        lastRayCheckTime = Time.time;

        Vector3 origin = transform.position + Vector3.up * 0.5f;
        Vector3 forwardDir = transform.forward;

        isBlocked = Physics.Raycast(origin, forwardDir, out RaycastHit hit, stuckRayLength, obstacleMask);
        Debug.DrawRay(origin, forwardDir * stuckRayLength, isBlocked ? Color.red : Color.green, stuckRayCheckInterval);

        bool isMoving = rb.velocity.magnitude > 0.5f;

        if (isBlocked || !isMoving)
        {
            stuckDuration += stuckRayCheckInterval;

            if (stuckDuration >= maxStuckTime)
            {
                Vector3 unstuckPosition = transform.position - transform.forward * unstuckMoveDistance;
                unstuckPosition.y = transform.position.y; 
                rb.MovePosition(unstuckPosition);

                rb.velocity = Vector3.zero;
                rb.angularVelocity = Vector3.zero;

                stuckDuration = 0f;
            }
        }
        else
        {
            stuckDuration = 0f;
        }
    }
    void ApplyForwardForce()
    {
        if(isBlocked)
            return;
        Vector3 forwardForce = transform.forward * constantForwardForce * Time.fixedDeltaTime ;
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
