using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class FinishLine_Checker : MonoBehaviour
{
    private void OnTriggerEnter(Collider other)
    {
        if(!SystemManager.Instance.GameEnded)
        {
            SystemManager.Instance.EndGame(other.gameObject.GetComponent<PlayerController>() != null);
        }
    }
}
