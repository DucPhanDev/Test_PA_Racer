using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class AICarController : MonoBehaviour
{
    [Header("Movement Settings")]
    public float constantForwardForce = 10000f;
    public float maxSpeed = 20f;
    public float steerStrength = 20000f;
    public float brakeStrength = 30f;

    [Range(0f, 1f)]
    public float baseGrip = 1f;
    [Range(0f, 1f)]
    public float driftGripMultiplier = 0.8f;
    public float driftTorqueMultiplier = 0.2f;

    [Header("Drift Kick Out Settings")]
    public float kickOutForce = 5e7f;
    public float kickOutSpeedThreshold = 20f;
    public float kickOutSteerThreshold = 0.5f;

    [Header("Raycast Sensor")]
    public float sensorLength = 5f;

    [Header("Waypoints")]
    public List<Transform> waypoints;
    public float waypointReachThreshold = 5f;

    private Rigidbody rb;
    private int currentWaypointIndex = 0;
    private float steerAmount;
    private float currentGrip;
    private Vector3 targetDirection;

    void Awake()
    {
        rb = GetComponent<Rigidbody>();
        currentGrip = baseGrip;
    }

    void FixedUpdate()
    {
        if (!SystemManager.Instance.GameStarted || SystemManager.Instance.GameEnded)
            return;
        UpdateWaypointTarget();
        HandleSensor();
        HandleMovement();
        HandleDrift();
    }

    void UpdateWaypointTarget()
    {
        if (waypoints == null || waypoints.Count == 0)
            return;
        if (currentWaypointIndex >= waypoints.Count)
            return;

        Vector3 toWaypoint = waypoints[currentWaypointIndex].position - transform.position;
        if (toWaypoint.magnitude < waypointReachThreshold)
        {
            currentWaypointIndex++;


            if (currentWaypointIndex >= waypoints.Count)
            {
                currentWaypointIndex = waypoints.Count;
                targetDirection = Vector3.zero;
                return;
            }
        }

        targetDirection = (waypoints[currentWaypointIndex].position - transform.position).normalized;
    }

    void HandleSensor()
    {
        Vector3 left = transform.position - transform.right * 1.5f;
        Vector3 right = transform.position + transform.right * 1.5f;
        Vector3 forward = transform.position + transform.forward * 1.5f;

        bool hitLeft = Physics.Raycast(left, transform.forward, out _, sensorLength);
        bool hitRight = Physics.Raycast(right, transform.forward, out _, sensorLength);
        bool hitCenter = Physics.Raycast(forward, transform.forward, out _, sensorLength);

        Vector3 avoidDirection = Vector3.zero;

        if (hitLeft)
            avoidDirection += transform.right;
        if (hitRight)
            avoidDirection -= transform.right;
        if (!hitLeft && !hitRight && hitCenter)
            avoidDirection -= transform.right;

        // Blend avoidance with waypoint steering
        Vector3 combinedDir = (targetDirection + avoidDirection).normalized;
        Vector3 localTargetDir = transform.InverseTransformDirection(combinedDir);
        steerAmount = Mathf.Clamp(localTargetDir.x, -1f, 1f);
    }

    void HandleMovement()
    {
        Vector3 forwardForce = transform.forward * constantForwardForce * Time.fixedDeltaTime;
        rb.AddForce(forwardForce, ForceMode.Force);

        if (rb.velocity.magnitude > maxSpeed)
        {
            rb.velocity = rb.velocity.normalized * maxSpeed;
        }

        rb.AddTorque(transform.up * steerAmount * steerStrength * Time.fixedDeltaTime, ForceMode.Force);
    }

    void HandleDrift()
    {
        Vector3 rightVelocity = Vector3.Project(rb.velocity, transform.right);

        currentGrip = baseGrip;
        if (Mathf.Abs(steerAmount) > 0.5f)
        {
            currentGrip *= driftGripMultiplier;

            if (rb.velocity.magnitude > kickOutSpeedThreshold)
            {
                rb.AddForce(transform.right * steerAmount * kickOutForce * Time.fixedDeltaTime, ForceMode.Force);
            }
        }

        rb.velocity -= rightVelocity * (1f - currentGrip);
        rb.angularVelocity *= currentGrip;
    }
}
