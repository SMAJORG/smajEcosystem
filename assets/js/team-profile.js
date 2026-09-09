import { supabaseClient } from "./supabase-client.js";
import { fallbackTeamMembers } from "./team-fallback.js";

const socialIcons = {
    linkedin: "bxl-linkedin",
    github: "bxl-github",
    facebook: "bxl-facebook",
    instagram: "bxl-instagram",
    telegram: "bxl-telegram",
    tiktok: "bxl-tiktok",
    youtube: "bxl-youtube"
};

document.addEventListener("DOMContentLoaded", loadProfile);

async function loadProfile() {
    const container = document.querySelector("[data-team-profile]");
    const slug = new URLSearchParams(window.location.search).get("profile")?.trim();
    if (!container || !slug) {
        renderNotFound(container);
        return;
    }

    const { data: member, error } = await supabaseClient
        .from("team_members")
        .select("slug, full_name, job_title, biography, photo_url, email, skills, social_links")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

    if (error) console.error("Leadership profile load failed:", error);

    const resolvedMember = member || fallbackTeamMembers.find(item => item.slug === slug);
    if (!resolvedMember) {
        renderNotFound(container);
        return;
    }

    renderProfile(container, resolvedMember);
    document.title = `${resolvedMember.full_name} | SMAJ Ecosystem`;
    document.querySelector('meta[name="description"]')?.setAttribute(
        "content",
        `${resolvedMember.full_name}, ${resolvedMember.job_title} at SMAJ Ecosystem.`
    );
}

function renderProfile(container, member) {
    container.replaceChildren();

    const portrait = document.createElement("div");
    portrait.className = member.photo_url ? "team-profile-portrait" : "team-profile-portrait team-image-placeholder";
    if (member.photo_url) {
        const image = document.createElement("img");
        image.src = member.photo_url;
        image.alt = member.full_name;
        portrait.append(image);
    } else {
        const icon = document.createElement("i");
        icon.className = "bx bx-user";
        portrait.append(icon);
    }

    const content = document.createElement("div");
    content.className = "team-profile-details";
    const eyebrow = document.createElement("span");
    eyebrow.className = "application-kicker";
    eyebrow.textContent = "SMAJ Leadership";
    const name = document.createElement("h1");
    name.textContent = member.full_name;
    const role = document.createElement("p");
    role.className = "team-profile-role";
    role.textContent = member.job_title;
    const biography = document.createElement("p");
    biography.className = "team-profile-bio";
    biography.textContent = member.biography;
    content.append(eyebrow, name, role, biography);

    if (member.skills?.length) {
        const heading = document.createElement("h2");
        heading.textContent = "Focus areas";
        const skills = document.createElement("div");
        skills.className = "team-profile-skills";
        member.skills.forEach(value => {
            const skill = document.createElement("span");
            skill.textContent = value;
            skills.append(skill);
        });
        content.append(heading, skills);
    }

    const socials = createSocialLinks(member);
    if (socials.childElementCount) content.append(socials);
    container.append(portrait, content);
}

function createSocialLinks(member) {
    const wrapper = document.createElement("div");
    wrapper.className = "team-profile-socials";
    if (member.email) wrapper.append(createLink(`mailto:${member.email}`, "Email", "bx-envelope"));

    Object.entries(member.social_links || {}).forEach(([network, value]) => {
        const url = safeExternalUrl(value);
        if (!url) return;
        const label = network === "x" ? "X" : network.charAt(0).toUpperCase() + network.slice(1);
        wrapper.append(createLink(url, label, socialIcons[network]));
    });
    return wrapper;
}

function createLink(url, label, iconName) {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("aria-label", label);
    link.title = label;
    if (!url.startsWith("mailto:")) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
    }
    if (label === "X") {
        const mark = document.createElement("span");
        mark.className = "social-x-mark";
        mark.textContent = "X";
        link.append(mark);
    } else {
        const icon = document.createElement("i");
        icon.className = `bx ${iconName || "bx-link-external"}`;
        link.append(icon);
    }
    return link;
}

function safeExternalUrl(value) {
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}

function renderNotFound(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="team-profile-not-found">
            <i class="bx bx-user-x"></i>
            <h1>Profile not found</h1>
            <p>This leadership profile is unavailable or has not been published.</p>
            <a class="btn btn-primary" href="/about/">Return to About</a>
        </div>`;
}
