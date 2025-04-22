using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Luna;

public class SystemManager : MonoBehaviour
{
    [Header("Views")]
    [SerializeField] private GameObject view_UI_Tutorial;
    [SerializeField] private EndView view_EndGame;

    [SerializeField] private Joystick joyStick;

    private float time_Delay_ShowEnd = 1f;

    private bool gameStarted;
    public bool GameStarted => gameStarted;


    private bool gameEnded;
    public bool GameEnded => gameEnded;

    private static SystemManager instance;
    public static SystemManager Instance
    {
        get
        {
            return instance;
        }
    }
    private void Awake()
    {
        instance = this;
        SetDefault();
    }

    private void SetDefault()
    {
        view_UI_Tutorial.gameObject.SetActive(true);
        view_EndGame.gameObject.SetActive(false);
    }

    public void EndGame(bool isWin)
    {
        gameEnded = true;
        Luna.Unity.LifeCycle.GameEnded();
        StartCoroutine(IE_Wait_ShowEndView(isWin));
    }
    private IEnumerator IE_Wait_ShowEndView(bool isWin)
    {
        yield return new WaitForSeconds(time_Delay_ShowEnd);
        view_EndGame.gameObject.SetActive(true);
        view_EndGame.ShowView();
    }
    public void OnClick_CTA()
    {
        Luna.Unity.Playable.InstallFullGame();
    }

    private void Update()
    {
        if (!gameStarted)

        {
            if (joyStick.Horizontal != 0)
            {
                view_UI_Tutorial.gameObject.SetActive(false);
                gameStarted = true;
            }

        }
    }
}
