using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Yaad.Spatial.Models;
using Yaad.Spatial.Services;

namespace Yaad.Spatial
{
    /// <summary>
    /// RecentMemoriesCarousel
    /// Displays an interactive horizontal carousel of tracked belongings in Yaad.
    /// Integrates with YaadApiClient to fetch real items in Cloud Mode or fixtures in Demo Mode.
    /// Supports pagination, card selection, loading states, and detailed inspection modal.
    /// </summary>
    public class RecentMemoriesCarousel : MonoBehaviour
    {
        [Header("Carousel Containers")]
        [SerializeField] private Transform cardsContainer;
        [SerializeField] private Button prevPageButton;
        [SerializeField] private Button nextPageButton;
        [SerializeField] private Text pageIndicatorText;
        [SerializeField] private Text loadingStatusText;

        [Header("Detail Modal")]
        [SerializeField] private GameObject detailModal;
        [SerializeField] private Text detailItemNameText;
        [SerializeField] private Text detailLocationText;
        [SerializeField] private Text detailTimestampText;
        [SerializeField] private Text detailCategoryText;
        [SerializeField] private Text detailNotesText;
        [SerializeField] private Text detailHistoryText;
        [SerializeField] private Button closeDetailButton;

        private List<SpatialTrackedItem> trackedItems = new List<SpatialTrackedItem>();
        private int currentPageIndex = 0;
        private const int itemsPerPage = 3;
        private bool isLoading = false;

        private void Start()
        {
            if (prevPageButton != null) prevPageButton.onClick.AddListener(PreviousPage);
            if (nextPageButton != null) nextPageButton.onClick.AddListener(NextPage);
            if (closeDetailButton != null) closeDetailButton.onClick.AddListener(CloseDetailModal);

            if (detailModal != null) detailModal.SetActive(false);
            RefreshItems();
        }

        private void OnDestroy()
        {
            if (prevPageButton != null) prevPageButton.onClick.RemoveListener(PreviousPage);
            if (nextPageButton != null) nextPageButton.onClick.RemoveListener(NextPage);
            if (closeDetailButton != null) closeDetailButton.onClick.RemoveListener(CloseDetailModal);
        }

        public void RefreshItems()
        {
            if (isLoading) return;
            isLoading = true;

            if (loadingStatusText != null)
            {
                loadingStatusText.gameObject.SetActive(true);
                loadingStatusText.text = "Loading tracked belongings...";
            }

            if (YaadApiClient.Instance != null)
            {
                YaadApiClient.Instance.FetchItems((success, items, error) =>
                {
                    isLoading = false;
                    if (loadingStatusText != null) loadingStatusText.gameObject.SetActive(false);

                    if (success && items != null)
                    {
                        trackedItems = items;
                        currentPageIndex = 0;
                        RenderCurrentPage();
                    }
                    else
                    {
                        Debug.LogWarning($"[RecentMemories] Fetch failed: {error}. Falling back to local data.");
                        if (trackedItems.Count == 0) SeedFallbackItems();
                        RenderCurrentPage();
                    }
                });
            }
            else
            {
                isLoading = false;
                if (loadingStatusText != null) loadingStatusText.gameObject.SetActive(false);
                if (trackedItems.Count == 0) SeedFallbackItems();
                RenderCurrentPage();
            }
        }

        private void SeedFallbackItems()
        {
            trackedItems.Add(new SpatialTrackedItem(
                "item_1", "Car Keys with Blue Tag", "Everyday Carry", "Oak Wooden Desk near MacBook", "Today at 10:15 AM",
                new Color(0.2f, 0.6f, 0.95f), "Attached to keychain with silver bottle opener.",
                new List<string> { "Captured 10:15 AM on Desk", "Observed 8:30 AM in Kitchen Tray" }
            ));
            trackedItems.Add(new SpatialTrackedItem(
                "item_2", "Reading Glasses (Tortoise)", "Health & Vision", "Bedside Nightstand by Lamp", "Yesterday at 9:30 PM",
                new Color(0.95f, 0.6f, 0.2f), "Tortoise shell frame, anti-glare lenses.",
                new List<string> { "Captured 9:30 PM on Nightstand", "Observed 3:15 PM on Living Room Sofa" }
            ));
            trackedItems.Add(new SpatialTrackedItem(
                "item_3", "Brown Leather Wallet", "Everyday Carry", "Hallway Console Table near Entrance", "Today at 8:45 AM",
                new Color(0.3f, 0.8f, 0.5f), "Bifold brown leather with transit pass in outer slot.",
                new List<string> { "Captured 8:45 AM on Hallway Console" }
            ));
        }

        public void AddTrackedItem(SpatialTrackedItem item)
        {
            if (item == null) return;
            trackedItems.Insert(0, item);
            currentPageIndex = 0;
            RenderCurrentPage();
            Debug.Log($"[RecentMemories] Added item to carousel: {item.name}");
        }

        public void NextPage()
        {
            int maxPages = Mathf.Max(1, Mathf.CeilToInt((float)trackedItems.Count / itemsPerPage));
            if (currentPageIndex < maxPages - 1)
            {
                if (SpatialAudioService.Instance != null)
                {
                    SpatialAudioService.Instance.PlayTabSwitch();
                }
                currentPageIndex++;
                RenderCurrentPage();
            }
        }

        public void PreviousPage()
        {
            if (currentPageIndex > 0)
            {
                if (SpatialAudioService.Instance != null)
                {
                    SpatialAudioService.Instance.PlayTabSwitch();
                }
                currentPageIndex--;
                RenderCurrentPage();
            }
        }

        public void RenderCurrentPage()
        {
            if (cardsContainer == null) return;

            foreach (Transform child in cardsContainer)
            {
                Destroy(child.gameObject);
            }

            if (trackedItems.Count == 0)
            {
                if (pageIndicatorText != null) pageIndicatorText.text = "No tracked belongings found.";
                return;
            }

            int startIndex = currentPageIndex * itemsPerPage;
            int count = Mathf.Min(itemsPerPage, trackedItems.Count - startIndex);

            for (int i = 0; i < count; i++)
            {
                var item = trackedItems[startIndex + i];
                CreateCardElement(item, cardsContainer);
            }

            int maxPages = Mathf.Max(1, Mathf.CeilToInt((float)trackedItems.Count / itemsPerPage));
            if (pageIndicatorText != null)
            {
                pageIndicatorText.text = $"Page {currentPageIndex + 1} of {maxPages} ({trackedItems.Count} total)";
            }
        }

        private void CreateCardElement(SpatialTrackedItem item, Transform parent)
        {
            GameObject cardObj = new GameObject($"Card_{item.name}", typeof(RectTransform), typeof(Image), typeof(Button), typeof(VerticalLayoutGroup));
            cardObj.transform.SetParent(parent, false);

            RectTransform rt = cardObj.GetComponent<RectTransform>();
            rt.sizeDelta = new Vector2(240, 280);

            Image bg = cardObj.GetComponent<Image>();
            bg.color = new Color(0.12f, 0.16f, 0.24f, 0.95f);

            VerticalLayoutGroup vlg = cardObj.GetComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(16, 16, 16, 16);
            vlg.spacing = 10;
            vlg.childAlignment = TextAnchor.UpperLeft;
            vlg.childControlWidth = true;
            vlg.childControlHeight = false;

            // Badge Header (Category & Status)
            GameObject badgeObj = new GameObject("BadgeText", typeof(RectTransform), typeof(Text));
            badgeObj.transform.SetParent(cardObj.transform, false);
            Text badgeText = badgeObj.GetComponent<Text>();
            badgeText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            badgeText.fontSize = 11;
            badgeText.color = item.accentColor;
            badgeText.text = $"{item.category.ToUpper()} · {item.status.ToUpper()}";
            badgeObj.GetComponent<RectTransform>().sizeDelta = new Vector2(208, 18);

            // Title
            GameObject titleObj = new GameObject("TitleText", typeof(RectTransform), typeof(Text));
            titleObj.transform.SetParent(cardObj.transform, false);
            Text titleText = titleObj.GetComponent<Text>();
            titleText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            titleText.fontSize = 16;
            titleText.fontStyle = FontStyle.Bold;
            titleText.color = Color.white;
            titleText.text = item.name;
            titleObj.GetComponent<RectTransform>().sizeDelta = new Vector2(208, 44);

            // Location
            GameObject locObj = new GameObject("LocationText", typeof(RectTransform), typeof(Text));
            locObj.transform.SetParent(cardObj.transform, false);
            Text locText = locObj.GetComponent<Text>();
            locText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            locText.fontSize = 12;
            locText.color = new Color(0.8f, 0.85f, 0.9f);
            locText.text = $"📍 {item.lastSeenLocation}";
            locObj.GetComponent<RectTransform>().sizeDelta = new Vector2(208, 48);

            // Timestamp
            GameObject timeObj = new GameObject("TimeText", typeof(RectTransform), typeof(Text));
            timeObj.transform.SetParent(cardObj.transform, false);
            Text timeText = timeObj.GetComponent<Text>();
            timeText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            timeText.fontSize = 11;
            timeText.color = new Color(0.6f, 0.65f, 0.75f);
            timeText.text = $"🕒 {item.lastSeenTimestamp}";
            timeObj.GetComponent<RectTransform>().sizeDelta = new Vector2(208, 20);

            Button btn = cardObj.GetComponent<Button>();
            btn.onClick.AddListener(() => OpenDetailModal(item));
        }

        public void OpenDetailModal(SpatialTrackedItem item)
        {
            if (detailModal == null) return;

            if (SpatialAudioService.Instance != null)
            {
                SpatialAudioService.Instance.PlayClick();
            }

            detailModal.SetActive(true);

            if (detailItemNameText != null) detailItemNameText.text = item.name;
            if (detailLocationText != null) detailLocationText.text = $"📍 Last Recorded Location: {item.lastSeenLocation}";
            if (detailTimestampText != null) detailTimestampText.text = $"🕒 Timestamp: {item.lastSeenTimestamp}";
            if (detailCategoryText != null) detailCategoryText.text = $"Category: {item.category} (Status: {item.status})";
            if (detailNotesText != null) detailNotesText.text = $"Notes: {item.notes}";

            if (detailHistoryText != null)
            {
                string hist = "Observation History:\n";
                foreach (var entry in item.observationHistory)
                {
                    hist += $"• {entry}\n";
                }
                detailHistoryText.text = hist;
            }

            Debug.Log($"[RecentMemories] Opened detail modal for: {item.name}");
        }

        public void CloseDetailModal()
        {
            if (SpatialAudioService.Instance != null)
            {
                SpatialAudioService.Instance.PlayClick();
            }

            if (detailModal != null)
            {
                detailModal.SetActive(false);
            }
        }
    }
}
