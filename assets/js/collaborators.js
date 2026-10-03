import { supabaseClient } from "./supabase-client.js";

document.addEventListener("DOMContentLoaded", loadCollaborators);

async function loadCollaborators() {
    const list = document.querySelector("[data-collaborator-list]");
    const status = document.querySelector("[data-collaborator-status]");
    if (!list) return;

    const { data, error } = await supabaseClient
        .from("collaborators")
        .select("name,website_url,logo_url,display_order")
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

    if (error || !data?.length) {
        if (error) console.error("Collaborators load failed:", error);
        if (status) status.textContent = "";
        return;
    }

    list.innerHTML = data.map(createCard).join("");
}

function createCard(item) {
    const content = '<img src="' + escapeAttribute(item.logo_url) + '" alt="' + escapeAttribute(item.name) + ' logo" loading="lazy"><span>' + escapeHtml(item.name) + '</span>';
    return item.website_url
        ? '<a class="collaborator-logo-card" href="' + escapeAttribute(item.website_url) + '" target="_blank" rel="noopener noreferrer">' + content + '</a>'
        : '<article class="collaborator-logo-card">' + content + '</article>';
}

function escapeHtml(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function escapeAttribute(value) { return escapeHtml(value); }