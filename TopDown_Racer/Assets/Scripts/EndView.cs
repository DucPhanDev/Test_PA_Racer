using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using DG.Tweening;
using UnityEngine.UI;

public class EndView : MonoBehaviour
{
    [SerializeField] private AudioSource audioSource;
    [SerializeField] private Transform trans_Container;
    [SerializeField] private Text txt_WinLose;

    public void ShowView(bool isWin = false)
    {
        txt_WinLose.text = isWin ? "YOU WIN" : "YOU LOSE";
        trans_Container.DOScale(1, 0.5f);
    }
    public void OnClick_CTA()
    {
        SystemManager.Instance.OnClick_CTA();
        audioSource.PlayOneShot(AudioManager.Instance.audClip_ClickBtn);
    }
}
