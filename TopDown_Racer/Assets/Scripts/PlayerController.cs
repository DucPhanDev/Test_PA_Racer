using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class PlayerController : MonoBehaviour
{
    [Header("Wheel Colliders")]
    [SerializeField] private WheelCollider wheelColliderFL;
    [SerializeField] private WheelCollider wheelColliderFR;
    [SerializeField] private WheelCollider wheelColliderRL;
    [SerializeField] private WheelCollider wheelColliderRR;

    [Header("Wheel Meshes")]
    [SerializeField] private Transform wheelFL;
    [SerializeField] private Transform wheelFR;
    [SerializeField] private Transform wheelRL;
    [SerializeField] private Transform wheelRR;

    [Header("Car Settings")]
    public float motorTorque = 1500f;
    public float maxSteerAngle = 30f;
    public float brakeForce = 3000f;
    private void Start()
    {
        UpdateWheelsVisual();
    }
    void HandleMotor()
    {
        float vertical = Input.GetAxis("Vertical");

        // Apply motor torque to rear wheels (RWD)
        wheelColliderRL.motorTorque = vertical * motorTorque;
        wheelColliderRR.motorTorque = vertical * motorTorque;

        // Brake (when reversing)
        bool isBraking = vertical < 0f;
        float appliedBrake = isBraking ? brakeForce : 0f;

        wheelColliderFL.brakeTorque = appliedBrake;
        wheelColliderFR.brakeTorque = appliedBrake;
        wheelColliderRL.brakeTorque = appliedBrake;
        wheelColliderRR.brakeTorque = appliedBrake;
    }
    void FixedUpdate()
    {
        HandleMotor();
        HandleSteering();
        UpdateWheelsVisual();
    }
    void HandleSteering()
    {
        float horizontal = Input.GetAxis("Horizontal");

        float steerAngle = horizontal * maxSteerAngle;

        // Apply steering to front wheels
        wheelColliderFL.steerAngle = steerAngle;
        wheelColliderFR.steerAngle = steerAngle;
    }

    void UpdateWheelsVisual()
    {
        UpdateWheelPose(wheelColliderFL, wheelFL);
        UpdateWheelPose(wheelColliderFR, wheelFR);
        UpdateWheelPose(wheelColliderRL, wheelRL);
        UpdateWheelPose(wheelColliderRR, wheelRR);
    }

    void UpdateWheelPose(WheelCollider collider, Transform wheelTransform)
    {

        Vector3 pos;
        Quaternion rot;
        collider.GetWorldPose(out pos, out rot);

        wheelTransform.position = pos;
        wheelTransform.rotation = rot;
    }
}
