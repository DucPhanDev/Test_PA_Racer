using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class Camera_Follow : MonoBehaviour
{
	[SerializeField] private Camera mainCamera;
    [SerializeField] private Vector3 offset;
	[SerializeField] private Transform transTarget;
	public float moveSpeed = 2f;
	// Use this for initialization
	void Awake ()
	{
		offset = transform.position - transTarget.position;
	}
	
	// Update is called once per frame
	void LateUpdate ()
	{
		transform.position = Vector3.Lerp (transform.position, transTarget.position + offset, Time.deltaTime * moveSpeed);
	}
    private void Update()
    {
        float screenRatio = (Screen.width / Screen.height);
        if (screenRatio >= 1)
        {
            // Landscape Layout
			mainCamera.fieldOfView = 55;
        }
        else if (screenRatio < 1)
        {
            // Portrait Layout
			mainCamera.fieldOfView = 70;
        }
    }
}
