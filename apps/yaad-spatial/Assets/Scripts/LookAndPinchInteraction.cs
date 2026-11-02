using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using Yaad.Spatial.Services;

namespace Yaad.Spatial
{
    /// <summary>
    /// LookAndPinchInteraction
    /// Enhanced gaze-hover and pinch-selection interaction system for Meta VR Glasses and Meta Quest.
    /// Features smooth reticle scaling, subtle button emphasis, state coloring, and spatial audio feedback.
    /// </summary>
    public class LookAndPinchInteraction : MonoBehaviour
    {
        [Header("Gaze Reticle")]
        [SerializeField] private RectTransform reticleTransform;
        [SerializeField] private Image reticleImage;
        [SerializeField] private Color normalColor = new Color(0.92f, 0.95f, 1f, 0.55f);
        [SerializeField] private Color hoverColor = new Color(0.15f, 0.75f, 1f, 0.95f);      // Yaad Brand Blue
        [SerializeField] private Color pinchColor = new Color(0.1f, 0.85f, 0.5f, 1f);        // Success Emerald

        [Header("Reticle Animation")]
        [SerializeField] private float restingScale = 1.0f;
        [SerializeField] private float hoverScale = 1.35f;
        [SerializeField] private float pinchScale = 0.85f;
        [SerializeField] private float scaleSmoothing = 14.0f;

        [Header("Interaction Raycast")]
        [SerializeField] private float maxDistance = 5.0f;
        [SerializeField] private LayerMask interactableLayers = ~0;

        private Button hoveredButton = null;
        private Transform hoveredTransform = null;
        private Vector3 originalButtonScale = Vector3.one;

        private Camera targetCamera;
        private List<RaycastResult> raycastResults = new List<RaycastResult>();
        private float targetReticleScale = 1.0f;
        private Color targetReticleColor;

        private void Start()
        {
            targetCamera = Camera.main;
            targetReticleScale = restingScale;
            targetReticleColor = normalColor;

            if (reticleImage != null)
            {
                reticleImage.color = normalColor;
            }
        }

        private void Update()
        {
            if (targetCamera == null)
            {
                targetCamera = Camera.main;
                if (targetCamera == null) return;
            }

            Button detectedButton = DetectTargetButton();

            // Gaze Hover State Transitions
            if (detectedButton != hoveredButton)
            {
                // Reset previous button scale
                if (hoveredTransform != null)
                {
                    hoveredTransform.localScale = originalButtonScale;
                }

                hoveredButton = detectedButton;

                if (hoveredButton != null)
                {
                    hoveredTransform = hoveredButton.transform;
                    originalButtonScale = hoveredTransform.localScale;

                    targetReticleScale = hoverScale;
                    targetReticleColor = hoverColor;

                    // Trigger subtle audio feedback once upon hover enter
                    if (SpatialAudioService.Instance != null)
                    {
                        SpatialAudioService.Instance.PlayHover();
                    }
                }
                else
                {
                    hoveredTransform = null;
                    targetReticleScale = restingScale;
                    targetReticleColor = normalColor;
                }
            }

            // Subtle button hover emphasis
            if (hoveredTransform != null)
            {
                hoveredTransform.localScale = Vector3.Lerp(
                    hoveredTransform.localScale,
                    originalButtonScale * 1.035f,
                    Time.unscaledDeltaTime * 12.0f
                );
            }

            // Simulated Pinch Trigger (Spacebar, Left Mouse Click, Controller Trigger)
            bool isPinchDown = Input.GetKeyDown(KeyCode.Space) || Input.GetMouseButtonDown(0);
            bool isPinchUp = Input.GetKeyUp(KeyCode.Space) || Input.GetMouseButtonUp(0);

            if (isPinchDown)
            {
                targetReticleScale = pinchScale;
                targetReticleColor = pinchColor;

                if (hoveredButton != null && hoveredButton.interactable)
                {
                    if (SpatialAudioService.Instance != null)
                    {
                        SpatialAudioService.Instance.PlayClick();
                    }

                    hoveredButton.onClick.Invoke();
                    Debug.Log($"[LookAndPinch] Pinch executed on: {hoveredButton.name}");
                }
            }
            else if (isPinchUp)
            {
                targetReticleScale = hoveredButton != null ? hoverScale : restingScale;
                targetReticleColor = hoveredButton != null ? hoverColor : normalColor;
            }

            // Smooth Reticle Animation (Scale & Color Lerp)
            if (reticleTransform != null)
            {
                float currentScale = reticleTransform.localScale.x;
                float newScale = Mathf.Lerp(currentScale, targetReticleScale, Time.unscaledDeltaTime * scaleSmoothing);
                reticleTransform.localScale = new Vector3(newScale, newScale, 1f);
            }

            if (reticleImage != null)
            {
                reticleImage.color = Color.Lerp(reticleImage.color, targetReticleColor, Time.unscaledDeltaTime * scaleSmoothing);
            }
        }

        private Button DetectTargetButton()
        {
            // 1. EventSystem Graphic Raycast at center of eye gaze / reticle
            if (EventSystem.current != null)
            {
                PointerEventData pointerData = new PointerEventData(EventSystem.current)
                {
                    position = new Vector2(Screen.width * 0.5f, Screen.height * 0.5f)
                };

                raycastResults.Clear();
                EventSystem.current.RaycastAll(pointerData, raycastResults);

                foreach (var result in raycastResults)
                {
                    Button btn = result.gameObject.GetComponentInParent<Button>();
                    if (btn != null && btn.interactable)
                    {
                        return btn;
                    }
                }
            }

            // 2. Fallback to 3D Physics Raycast
            Ray gazeRay = new Ray(targetCamera.transform.position, targetCamera.transform.forward);
            if (Physics.Raycast(gazeRay, out RaycastHit hit, maxDistance, interactableLayers))
            {
                Button btn = hit.collider.GetComponentInParent<Button>();
                if (btn != null && btn.interactable)
                {
                    return btn;
                }
            }

            return null;
        }

        private void OnDisable()
        {
            if (hoveredTransform != null)
            {
                hoveredTransform.localScale = originalButtonScale;
            }
        }
    }
}
