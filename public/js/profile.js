document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('.profile-tab-btn');
  const tabSections = document.querySelectorAll('.profile-tab-content');

  if (!tabButtons.length) return;

  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();

      const targetTab = button.getAttribute('data-tab');

      // Deactivate all tab buttons and hide all content sections
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabSections.forEach(sec => sec.classList.add('hidden'));

      // Activate clicked button and display the relevant tab section
      button.classList.add('active');
      const activeSection = document.getElementById(targetTab);
      if (activeSection) {
        activeSection.classList.remove('hidden');
      }
    });
  });
});
