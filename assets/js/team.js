import { supabaseClient } from "./supabase-client.js";

document.addEventListener("DOMContentLoaded", function () {
    initTeamCarousel();
    loadPublishedTeam();
});

async function loadPublishedTeam() {
    const container = document.querySelector("[data-team-members]");
    if (!container) return;

    const { data, error } = await supabaseClient
        .from("team_members")
        .select("slug, full_name, job_title, biography, photo_url, display_order")
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .order("full_name", { ascending: true });

    if (error) {
        console.error("Published team load failed:", error);
        // Keep the server-rendered team cards as a deployment-safe fallback.
        return;
    }

    if (!data?.length) {
        // An empty or not-yet-configured backend must not remove the
        // server-rendered team members from the About page.
        updateCarouselControls();
        return;
    }

    container.replaceChildren(...data.map(createMemberCard));
    updateCarouselControls();
}

function initTeamCarousel() {
    const container = document.querySelector("[data-team-members]");
    const previous = document.querySelector("[data-team-previous]");
    const next = document.querySelector("[data-team-next]");
    if (!container || !previous || !next) return;

    previous.addEventListener("click", () => scrollTeamCarousel(-1));
    next.addEventListener("click", () => scrollTeamCarousel(1));
    container.addEventListener("scroll", updateCarouselControls, { passive: true });
    window.addEventListener("resize", updateCarouselControls);
    updateCarouselControls();
}

function scrollTeamCarousel(direction) {
    const container = document.querySelector("[data-team-members]");
    const card = container?.querySelector(".team-member");
    if (!container || !card) return;
    const gap = parseFloat(window.getComputedStyle(container).columnGap) || 0;
    container.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: "smooth" });
}

function updateCarouselControls() {
    const container = document.querySelector("[data-team-members]");
    const previous = document.querySelector("[data-team-previous]");
    const next = document.querySelector("[data-team-next]");
    if (!container || !previous || !next) return;
    const maximum = Math.max(0, container.scrollWidth - container.clientWidth);
    previous.disabled = container.scrollLeft <= 2;
    next.disabled = container.scrollLeft >= maximum - 2;
}

function createMemberCard(member, index) {
    const card = document.createElement("article");
    card.className = "team-member";

    const imageBox = document.createElement("div");
    imageBox.className = member.photo_url ? "team-image" : "team-image team-image-placeholder";
    if (member.photo_url) {
        const image = document.createElement("img");
        image.src = member.photo_url;
        image.alt = member.full_name;
        image.loading = "lazy";
        imageBox.append(image);
    } else {
        const icon = document.createElement("i");
        icon.className = "bx bx-user";
        imageBox.append(icon);
    }

    const name = document.createElement("h4");
    const nameLink = document.createElement("a");
    nameLink.href = `/team/?profile=${encodeURIComponent(member.slug)}`;
    nameLink.textContent = member.full_name;
    name.append(nameLink);
    const role = document.createElement("p");
    role.className = "team-role";
    role.textContent = member.job_title;
    card.append(imageBox, name, role);
    return card;
}
