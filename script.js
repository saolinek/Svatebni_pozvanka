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
  const rsvpSuccessPanel = document.querySelector("[data-rsvp-success]");
  const rsvpSuccessTitle = document.querySelector("[data-rsvp-success-title]");
  const rsvpAgainBtn = document.querySelector("[data-rsvp-again]");
  const rsvpCloseBtn = document.querySelector("[data-rsvp-close]");
  
  const rsvpInlineSuccess = document.querySelector("[data-rsvp-inline-success]");
  const rsvpInlineTitle = document.querySelector("[data-rsvp-inline-title]");
  const rsvpInlineText = document.querySelector("[data-rsvp-inline-text]");
  const rsvpInlineAgainBtn = document.querySelector("[data-rsvp-inline-again]");

  const closeSuccessModal = () => {
    if (rsvpSuccessPanel) rsvpSuccessPanel.classList.remove("is-visible");
    document.body.classList.remove("modal-open");
  };

  const showSuccess = (name, attending) => {
    rsvpForm.hidden = true;
    if (rsvpSuccessTitle) {
      rsvpSuccessTitle.textContent = attending
        ? `Skvělé, ${name}! Těšíme se na vás! 🎉`
        : `Díky za odpověď, ${name}.`;
    }
    if (rsvpSuccessPanel) {
      const textEl = rsvpSuccessPanel.querySelector(".rsvp-success__text");
      if (textEl) {
        textEl.textContent = attending
          ? "Potvrzení jsme přijali. Pokud by se cokoli změnilo, napište nám."
          : "Mrzí nás to, ale chápeme. Pokud by se cokoli změnilo, ozvěte se nám.";
      }
      rsvpSuccessPanel.classList.add("is-visible");
      document.body.classList.add("modal-open");
    }

    if (rsvpInlineSuccess) {
      if (rsvpInlineTitle) {
        rsvpInlineTitle.textContent = attending
          ? `Těšíme se na vás, ${name}! 🎉`
          : `Díky za odpověď, ${name}.`;
      }
      if (rsvpInlineText) {
        rsvpInlineText.textContent = attending
          ? "Potvrzení bylo úspěšně odesláno. Pokud by se cokoli změnilo, napište nám."
          : "Odpověď byla úspěšně odeslána. Pokud by se cokoli změnilo, ozvěte se nám.";
      }
      rsvpInlineSuccess.classList.add("is-visible");
    }
  };

  const showForm = () => {
    rsvpForm.hidden = false;
    rsvpForm.reset();
    setStatus(rsvpStatus, "", "");
    if (rsvpSuccessPanel) rsvpSuccessPanel.classList.remove("is-visible");
    document.body.classList.remove("modal-open");
    if (rsvpInlineSuccess) rsvpInlineSuccess.classList.remove("is-visible");
  };

  if (rsvpAgainBtn) {
    rsvpAgainBtn.addEventListener("click", () => {
      closeSuccessModal();
      showForm();
    });
  }

  if (rsvpInlineAgainBtn) {
    rsvpInlineAgainBtn.addEventListener("click", showForm);
  }

  if (rsvpCloseBtn) {
    rsvpCloseBtn.addEventListener("click", closeSuccessModal);
  }

  if (rsvpSuccessPanel) {
    rsvpSuccessPanel.addEventListener("click", (e) => {
      if (e.target === rsvpSuccessPanel) {
        closeSuccessModal();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && rsvpSuccessPanel && rsvpSuccessPanel.classList.contains("is-visible")) {
      closeSuccessModal();
    }
  });

  rsvpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(rsvpForm);
    const submitButton = rsvpForm.querySelector("button[type='submit']");
    const payload = {
      guestName: formData.get("guestName"),
      attending: formData.get("attending") === "yes",
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
      showSuccess(String(payload.guestName).trim().split(" ")[0], payload.attending);
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
        const isActive = link.getAttribute("href") === `#${id}`;
        link.classList.toggle("is-active", isActive);
        if (isActive) {
          link.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
      });
    },
    {
      rootMargin: "-28% 0px -58% 0px",
      threshold: [0.08, 0.22, 0.44],
    }
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

/* Admin Dashboard Logic */
const adminDashboard = document.querySelector("[data-admin-dashboard]");
if (adminDashboard) {
  const statsEl = adminDashboard.querySelector("[data-admin-stats]");
  const rowsEl = adminDashboard.querySelector("[data-admin-rows]");
  const statusEl = adminDashboard.querySelector("[data-admin-status]");
  const guestRowsEl = adminDashboard.querySelector("[data-guest-status-rows]");

  const formatDateTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const escapeHtml = (str) => {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const loadAdminData = async () => {
    setStatus(statusEl, "Načítám data...", "");
    try {
      const data = await getJson("/.netlify/functions/rsvp");
      renderStats(data.responses, data.guests);
      renderTable(data.responses, data.guests);
      setStatus(statusEl, "", "");
    } catch (error) {
      setStatus(statusEl, "Nepodařilo se načíst data: " + error.message, "error");
    }
  };

  const renderStats = (responses, guests) => {
    if (!statsEl) return;

    const attendingGuests = guests.filter(g => responses.some(r => r.assignedGuestId === g.id && r.attending)).length;
    const declinedGuests = guests.filter(g => responses.some(r => r.assignedGuestId === g.id && !r.attending)).length;
    const pendingGuests = guests.length - attendingGuests - declinedGuests;

    statsEl.innerHTML = `
      <div class="admin-stat-card">
        <strong>${guests.length}</strong>
        <span>Pozvaných hostů</span>
      </div>
      <div class="admin-stat-card">
        <strong>${attendingGuests}</strong>
        <span>Potvrdilo</span>
      </div>
      <div class="admin-stat-card">
        <strong>${declinedGuests}</strong>
        <span>Odmítlo</span>
      </div>
      <div class="admin-stat-card">
        <strong>${pendingGuests}</strong>
        <span>Bez odpovědi</span>
      </div>
      <div class="admin-stat-card">
        <strong>${responses.length}</strong>
        <span>Odpovědí celkem</span>
      </div>
    `;
  };

  const renderTable = (responses, guests) => {
    if (!rowsEl) return;
    if (!responses.length) {
      rowsEl.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px;">Zatím žádné odpovědi.</td></tr>`;
    } else {
      rowsEl.innerHTML = responses
        .map((resp) => {
          const attendingBadge = resp.attending
            ? `<span class="badge badge--success">Ano</span>`
            : `<span class="badge badge--danger">Ne</span>`;

          const optionsHtml = [
            `<option value="">-- Nepřiřazeno --</option>`,
            ...guests.map((g) => {
              const selected = g.id === resp.assignedGuestId ? "selected" : "";
              return `<option value="${g.id}" ${selected}>${g.name} (${g.group || "Bez skupiny"})</option>`;
            }),
          ].join("");

          let noteContent = escapeHtml(resp.note) || '';
          const extras = [];
          if (resp.plusOne) {
            extras.push(`Doprovod: ${escapeHtml(resp.plusOne)}`);
          }
          if (resp.dietary) {
            extras.push(`Jídlo/Alergie: ${escapeHtml(resp.dietary)}`);
          }
          if (extras.length > 0) {
            const extrasStr = `<div class="admin-note-extras" style="font-size: 0.85em; margin-top: 4px; color: var(--color-text-muted); border-top: 1px dashed var(--color-border); padding-top: 4px;">${extras.join('<br>')}</div>`;
            noteContent = noteContent ? `${noteContent}${extrasStr}` : extrasStr;
          }
          if (!noteContent) {
            noteContent = '<span style="color: var(--color-text-muted); opacity: 0.5;">-</span>';
          }

          return `
            <tr data-response-id="${resp.responseId}">
              <td><strong>${escapeHtml(resp.guestName)}</strong></td>
              <td>${attendingBadge}</td>
              <td>${noteContent}</td>
              <td>
                <select class="admin-assign-select" data-response-id="${resp.responseId}">
                  ${optionsHtml}
                </select>
              </td>
              <td>${formatDateTime(resp.submittedAt)}</td>
              <td>
                <button class="admin-delete-btn" data-response-id="${resp.responseId}" aria-label="Odstranit odpověď od ${escapeHtml(resp.guestName)}">
                  Odstranit
                </button>
              </td>
            </tr>
          `;
        })
        .join("");

      rowsEl.querySelectorAll(".admin-assign-select").forEach((select) => {
        select.addEventListener("change", async (e) => {
          const responseId = e.target.dataset.responseId;
          const assignedGuestId = e.target.value;
          e.target.disabled = true;

          try {
            await getJson("/.netlify/functions/rsvp", {
              method: "PATCH",
              body: JSON.stringify({ responseId, assignedGuestId }),
            });
            await loadAdminData();
          } catch (err) {
            alert("Chyba při přiřazení: " + err.message);
            e.target.disabled = false;
          }
        });
      });

      rowsEl.querySelectorAll(".admin-delete-btn").forEach((button) => {
        button.addEventListener("click", async (e) => {
          const responseId = e.currentTarget.dataset.responseId;
          const row = e.currentTarget.closest("tr");
          const guestName = row.querySelector("td strong").textContent;

          if (confirm(`Opravdu chcete odstranit odpověď od hosta "${guestName}"?`)) {
            e.currentTarget.disabled = true;
            try {
              await getJson("/.netlify/functions/rsvp", {
                method: "DELETE",
                body: JSON.stringify({ responseId }),
              });
              await loadAdminData();
            } catch (err) {
              alert("Chyba při mazání: " + err.message);
              e.currentTarget.disabled = false;
            }
          }
        });
      });
    }

    // Render guest status list
    if (guestRowsEl) {
      if (!guests.length) {
        guestRowsEl.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 30px;">Žádní pozvaní hosté.</td></tr>`;
      } else {
        const sortedGuests = [...guests].sort((a, b) => {
          const groupCompare = (a.group || "").localeCompare(b.group || "");
          if (groupCompare !== 0) return groupCompare;
          return (a.name || "").localeCompare(b.name || "");
        });

        guestRowsEl.innerHTML = sortedGuests
          .map((guest) => {
            const guestResponse = responses.find((r) => r.assignedGuestId === guest.id);
            let statusBadge = "";
            let noteDetails = "";

            if (guestResponse) {
              if (guestResponse.attending) {
                statusBadge = `<span class="badge badge--success">Dorazí</span>`;
              } else {
                statusBadge = `<span class="badge badge--danger">Nedorazí</span>`;
              }

              const details = [];
              if (guestResponse.plusOne) {
                details.push(`Doprovod: ${escapeHtml(guestResponse.plusOne)}`);
              }
              if (guestResponse.dietary) {
                details.push(`Jídlo/Alergie: ${escapeHtml(guestResponse.dietary)}`);
              }
              if (guestResponse.note) {
                details.push(`Poznámka: ${escapeHtml(guestResponse.note)}`);
              }
              noteDetails = details.length > 0
                ? details.join("<br>")
                : `<span style="color: var(--color-text-muted); opacity: 0.5;">Bez poznámky</span>`;
            } else {
              statusBadge = `<span class="badge badge--neutral">Čeká na vyjádření</span>`;
              noteDetails = `<span style="color: var(--color-text-muted); opacity: 0.5;">-</span>`;
            }

            return `
              <tr>
                <td><strong>${escapeHtml(guest.name)}</strong></td>
                <td>${escapeHtml(guest.group || "Bez skupiny")}</td>
                <td>${statusBadge}</td>
                <td><div style="font-size: 0.9em; line-height: 1.4;">${noteDetails}</div></td>
              </tr>
            `;
          })
          .join("");
      }
    }
  };

  loadAdminData();
}
