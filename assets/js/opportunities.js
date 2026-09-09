import { supabaseClient } from "./supabase-client.js";
import { showFeedbackPopup } from "./feedback.js";

const profileKey = "smajOpportunityProfile";
const pendingKey = "smajPendingOpportunityApplications";
const fallbackOpportunities = [
    { slug: "full-stack-builder-smaj-pi-hub", title: "Full-Stack Product Builder", venture: "SMAJ PI HUB", summary: "Build trusted marketplace, identity, and utility experiences for verified Pi Network users.", opportunity_type: "builder", skills: ["javascript", "api", "database", "ui/ux"], interests: ["fintech", "marketplace", "pi network"], location_mode: "remote", location: "Global", commitment: "Project-based", is_featured: true },
    { slug: "ai-research-contributor", title: "AI Research Contributor", venture: "SMAJ Labs", summary: "Turn emerging AI research into practical experiments, evidence, and product opportunities.", opportunity_type: "research", skills: ["research", "data analysis", "artificial intelligence"], interests: ["ai", "research", "innovation"], location_mode: "remote", location: "Global", commitment: "Flexible", is_featured: true },
    { slug: "venture-cofounder", title: "Venture Co-Founder", venture: "SMAJ Ventures", summary: "Lead a validated technology concept from customer discovery through product launch and growth.", opportunity_type: "founder", skills: ["strategy", "product", "leadership"], interests: ["startups", "venture building", "technology"], location_mode: "hybrid", location: "Dubai, UAE / Remote", commitment: "Long-term", is_featured: false },
    { slug: "strategic-ecosystem-partner", title: "Strategic Ecosystem Partner", venture: "SMAJ Partners", summary: "Collaborate on distribution, technology, capital, research, or market access across SMAJ ventures.", opportunity_type: "partner", skills: ["partnerships", "business development", "operations"], interests: ["ecosystems", "innovation", "growth"], location_mode: "hybrid", location: "Global / Dubai, UAE", commitment: "Partnership", is_featured: false }
];

let opportunities = [];
let profile = loadJson(profileKey, {});
let selectedOpportunity = null;

document.addEventListener("DOMContentLoaded", async function () {
    bindProfileForm();
    bindApplicationForm();
    renderProfileSummary();
    await loadOpportunities();
    await retryPendingApplications();
});

async function loadOpportunities() {
    const status = document.querySelector("[data-opportunity-status]");
    try {
        const result = await supabaseClient.from("opportunities")
            .select("id,slug,title,venture,summary,opportunity_type,skills,interests,location_mode,location,commitment,is_featured,display_order")
            .eq("status", "published").order("is_featured", { ascending: false }).order("display_order", { ascending: true });
        if (result.error) throw result.error;
        opportunities = result.data && result.data.length ? result.data : fallbackOpportunities;
        setStatus(status, result.data && result.data.length ? "" : "Showing saved opportunities while the live catalog is empty.", "info");
    } catch (error) {
        console.error("Opportunity catalog load failed:", error);
        opportunities = fallbackOpportunities;
        setStatus(status, "Showing saved opportunities because the live catalog is unavailable.", "info");
    }
    renderOpportunities();
}

function bindProfileForm() {
    const form = document.querySelector("[data-match-profile]");
    if (!form) return;
    fillForm(form, profile);
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        const data = new FormData(form);
        profile = {
            full_name: String(data.get("full_name") || "").trim(),
            email: String(data.get("email") || "").trim(),
            skills: splitValues(data.get("skills")),
            interests: splitValues(data.get("interests")),
            location_mode: String(data.get("location_mode") || "any"),
            goal: String(data.get("goal") || "any")
        };
        localStorage.setItem(profileKey, JSON.stringify(profile));
        renderProfileSummary();
        renderOpportunities();
        setStatus(document.querySelector("[data-profile-status]"), "Profile saved. Your matches have been recalculated.", "success");
    });
}

function renderProfileSummary() {
    const summary = document.querySelector("[data-profile-summary]");
    if (!summary) return;
    const count = (profile.skills ? profile.skills.length : 0) + (profile.interests ? profile.interests.length : 0);
    summary.textContent = count
        ? (profile.full_name || "Your profile") + " - " + profile.skills.length + " skills - " + profile.interests.length + " interests"
        : "Add your skills and interests to unlock personalized match scores.";
}

function renderOpportunities() {
    const list = document.querySelector("[data-opportunity-list]");
    if (!list) return;
    const scored = opportunities.map(function (item) {
        return Object.assign({}, item, calculateMatch(item));
    }).sort(function (a, b) {
        return b.score - a.score || Number(b.is_featured) - Number(a.is_featured);
    });
    list.innerHTML = scored.map(createOpportunityCard).join("");
    list.querySelectorAll("[data-opportunity-apply]").forEach(function (button) {
        button.addEventListener("click", function () {
            selectedOpportunity = opportunities.find(function (item) { return item.slug === button.dataset.opportunityApply; });
            openApplication(selectedOpportunity);
        });
    });
}

function calculateMatch(opportunity) {
    const hasProfile = (profile.skills ? profile.skills.length : 0) + (profile.interests ? profile.interests.length : 0) > 0;
    if (!hasProfile) return { score: 0, reasons: ["Complete your profile for a match score"] };
    const skills = intersect(profile.skills, opportunity.skills);
    const interests = intersect(profile.interests, opportunity.interests);
    const locationMatches = profile.location_mode === "any" || profile.location_mode === opportunity.location_mode || opportunity.location_mode === "remote";
    const goalMatches = profile.goal === "any" || profile.goal === opportunity.opportunity_type;
    const skillScore = opportunity.skills.length ? skills.length / opportunity.skills.length : 0;
    const interestScore = opportunity.interests.length ? interests.length / opportunity.interests.length : 0;
    const score = Math.round(skillScore * 50 + interestScore * 25 + (locationMatches ? 15 : 0) + (goalMatches ? 10 : 0));
    const reasons = [];
    if (skills.length) reasons.push(skills.length + " matching skill" + (skills.length > 1 ? "s: " : ": ") + skills.slice(0, 2).join(", "));
    if (interests.length) reasons.push("Shared interest: " + interests[0]);
    if (locationMatches) reasons.push("Location preference fits");
    if (goalMatches) reasons.push("Collaboration goal fits");
    return { score: Math.min(100, score), reasons: reasons.length ? reasons : ["Explore this opportunity to expand your profile"] };
}

function createOpportunityCard(item) {
    const tags = item.skills.map(function (skill) { return "<span>" + escapeHtml(skill) + "</span>"; }).join("");
    const reasons = item.reasons.map(function (reason) { return '<li><i class="bx bx-check-circle"></i>' + escapeHtml(reason) + "</li>"; }).join("");
    return '<article class="opportunity-card ' + (item.is_featured ? "featured" : "") + '">' +
        '<div class="opportunity-card-top"><span class="opportunity-type">' + escapeHtml(item.opportunity_type) + '</span><span class="match-score">' + (item.score ? item.score + "% match" : "Explore") + "</span></div>" +
        '<p class="opportunity-venture">' + escapeHtml(item.venture) + "</p><h3>" + escapeHtml(item.title) + "</h3><p>" + escapeHtml(item.summary) + "</p>" +
        '<div class="opportunity-tags">' + tags + '</div><ul class="match-reasons">' + reasons + "</ul>" +
        '<div class="opportunity-meta"><span><i class="bx bx-map"></i>' + escapeHtml(item.location || item.location_mode) + '</span><span><i class="bx bx-time"></i>' + escapeHtml(item.commitment) + "</span></div>" +
        '<button class="btn btn-primary" type="button" data-opportunity-apply="' + escapeAttribute(item.slug) + '">Express Interest</button></article>';
}

function openApplication(opportunity) {
    if (!opportunity) return;
    const section = document.querySelector("[data-interest-section]");
    const form = document.querySelector("[data-interest-form]");
    section.hidden = false;
    document.querySelector("[data-selected-opportunity]").textContent = opportunity.title + " - " + opportunity.venture;
    if (profile.full_name) form.elements.full_name.value = profile.full_name;
    if (profile.email) form.elements.email.value = profile.email;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindApplicationForm() {
    const form = document.querySelector("[data-interest-form]");
    if (!form) return;
    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!selectedOpportunity) return;
        const button = form.querySelector('[type="submit"]');
        const status = document.querySelector("[data-interest-status]");
        const fields = new FormData(form);
        const record = {
            opportunity_id: selectedOpportunity.id || null,
            submission_key: createSubmissionKey(),
            opportunity_slug: selectedOpportunity.slug,
            full_name: String(fields.get("full_name") || "").trim(),
            email: String(fields.get("email") || "").trim(),
            message: String(fields.get("message") || "").trim(),
            profile: profile,
            status: "submitted"
        };
        button.disabled = true;
        setStatus(status, "Sending your interest...", "info");
        try {
            await submitApplication(record);
            setStatus(status, "Interest submitted successfully. The SMAJ team will contact you.", "success");
            form.reset();
        } catch (error) {
            console.error("Opportunity application failed:", error);
            queueApplication(record);
            setStatus(status, "Supabase is unavailable. Your interest is saved on this device and will retry when you return.", "info");
        } finally {
            button.disabled = false;
        }
    });
}

async function submitApplication(record) {
    let opportunityId = record.opportunity_id;
    if (!opportunityId) {
        const result = await supabaseClient.from("opportunities").select("id").eq("slug", record.opportunity_slug).eq("status", "published").maybeSingle();
        if (result.error || !result.data) throw result.error || new Error("Opportunity is not available yet.");
        opportunityId = result.data.id;
    }
    const payload = { opportunity_id: opportunityId, submission_key: record.submission_key, full_name: record.full_name, email: record.email, message: record.message, profile: record.profile, status: "submitted" };
    const result = await supabaseClient.from("opportunity_applications").insert(payload);
    if (result.error && result.error.code !== "23505") throw result.error;
}

function queueApplication(record) {
    const pending = loadJson(pendingKey, []);
    pending.push(record);
    localStorage.setItem(pendingKey, JSON.stringify(pending.slice(-10)));
}

async function retryPendingApplications() {
    const pending = loadJson(pendingKey, []);
    if (!pending.length) return;
    const remaining = [];
    for (const record of pending) {
        try { await submitApplication(record); } catch (error) { remaining.push(record); }
    }
    localStorage.setItem(pendingKey, JSON.stringify(remaining));
    if (remaining.length < pending.length) setStatus(document.querySelector("[data-opportunity-status]"), (pending.length - remaining.length) + " saved application(s) sent successfully.", "success");
}

function createSubmissionKey() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (character) {
        const random = Math.random() * 16 | 0;
        const value = character === "x" ? random : (random & 3 | 8);
        return value.toString(16);
    });
}
function fillForm(form, values) {
    Object.entries(values || {}).forEach(function (entry) {
        if (!form.elements[entry[0]]) return;
        form.elements[entry[0]].value = Array.isArray(entry[1]) ? entry[1].join(", ") : entry[1];
    });
}
function splitValues(value) { return String(value || "").split(",").map(function (item) { return item.trim().toLowerCase(); }).filter(Boolean); }
function intersect(left, right) { const values = (right || []).map(function (value) { return value.toLowerCase(); }); return (left || []).filter(function (value) { return values.includes(value.toLowerCase()); }); }
function loadJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (error) { return fallback; } }
function setStatus(element, message, type) { showFeedbackPopup(element, message, type); }
function escapeHtml(value) { return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
function escapeAttribute(value) { return escapeHtml(value); }