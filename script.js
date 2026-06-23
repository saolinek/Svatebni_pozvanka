const countdown = document.querySelector("[data-wedding-date]");
const header = document.querySelector(".site-header");
const navLinks = Array.from(document.querySelectorAll("nav a[href^='#']"));
const revealItems = Array.from(document.querySelectorAll("[data-reveal], .reveal-up"));
const sections = Array.from(document.querySelectorAll("[data-section]"));
const rsvpForm = document.querySelector("[data-rsvp-form]");
const guestNameInput = document.querySelector("[data-guest-name]");
const rsvpStatus = document.querySelector("[data-rsvp-status]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const setStatus = (element, message, type = "") => {
  if (!element) return;
  element.textContent = message;
  element.dataset.status = type;
};

const getJson = async (url, options) => {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok || !isJson) {
    throw new Error(data.error || "Požadavek se nepodařilo zpracovat.");
  }

  return data;
};

if (rsvpForm) {
  rsvpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(rsvpForm);
    const submitButton = rsvpForm.querySelector("button[type='submit']");
    const payload = {
      guestName: formData.get("guestName"),
      attending: formData.get("attending") === "yes",
      plusOne: formData.get("plusOne"),
      dietary: formData.get("dietary"),
      note: formData.get("note"),
    };

    if (!payload.guestName || String(payload.guestName).trim().length < 2) {
      guestNameInput?.focus();
      setStatus(rsvpStatus, "Napište prosím své jméno.", "error");
      return;
    }

    submitButton?.setAttribute("disabled", "");
    setStatus(rsvpStatus, "Odesílám potvrzení...", "");

    try {
      await getJson("/.netlify/functions/rsvp", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      rsvpForm.reset();
      setStatus(rsvpStatus, "Děkujeme, potvrzení máme uložené.", "success");
    } catch (error) {
      setStatus(rsvpStatus, error.message, "error");
    } finally {
      submitButton?.removeAttribute("disabled");
    }
  });
}

if (countdown) {
  const target = new Date(countdown.dataset.weddingDate).getTime();
  const daysEl = countdown.querySelector("[data-countdown-days]");
  const hoursEl = countdown.querySelector("[data-countdown-hours]");
  const minutesEl = countdown.querySelector("[data-countdown-minutes]");
  const secondsEl = countdown.querySelector("[data-countdown-seconds]");

  const renderCountdown = () => {
    const remaining = Math.max(target - Date.now(), 0);
    const seconds = Math.floor(remaining / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const restSeconds = seconds % 60;

    daysEl.textContent = String(days);
    hoursEl.textContent = String(hours).padStart(2, "0");
    minutesEl.textContent = String(minutes).padStart(2, "0");
    secondsEl.textContent = String(restSeconds).padStart(2, "0");
  };

  renderCountdown();
  window.setInterval(renderCountdown, 1000);
}

if (revealItems.length) {
  if (prefersReducedMotion) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.18,
      }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }
}

const updateHeader = () => {
  if (!header) return;

  const isScrolled = window.scrollY > 24;
  header.classList.toggle("is-scrolled", isScrolled);
};

const updateParallax = () => {
  if (prefersReducedMotion) return;
  document.documentElement.style.setProperty("--scroll-y", String(window.scrollY));
};

const onScroll = () => {
  updateHeader();
  updateParallax();
};

updateHeader();
updateParallax();
window.addEventListener("scroll", onScroll, { passive: true });

if (sections.length && navLinks.length) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visibleEntry) return;

      const id = visibleEntry.target.id;
      const theme = visibleEntry.target.dataset.theme || "light";

      header?.setAttribute("data-theme", theme);
      navLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
      });
    },
    {
      rootMargin: "-28% 0px -58% 0px",
      threshold: [0.08, 0.22, 0.44],
    }
  );

  sections.forEach((section) => sectionObserver.observe(section));
}
