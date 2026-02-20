/**
 * YouSearch Prompt Engineering — Regulatory Watchdog
 *
 * Industrial Logic: To ensure high-accuracy regulatory matching, we use a
 * structured, multi-step prompt that forces the LLM to identify specific
 * legal constraints as of the search date.
 */

export const getRegulatoryPrompt = (category: string, materials: string[]) => {
    return `
        Role: Senior EU Compliance Auditor (Textile & Fashion focus).
        Context: You are monitoring the latest EU 2026 ESPR (Ecodesign for Sustainable Products Regulation) mandates.
        
        Task: 
        1. Identify the latest EU regulatory requirements for the product category: "${category}".
        2. Specifically search for any "Restriction of Hazardous Substances" (RoHS) or "Banned Material Lists" updated as of February 2026.
        3. Cross-reference these new requirements against this material list: [${materials.join(', ')}].
        
        Required Output (JSON Format):
        {
          "new_mandates": ["list of specific laws or amendments"],
          "flagged_materials": ["any items from the material list that are now restricted"],
          "risk_score": 0-100,
          "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
          "auditor_note": "A concise summary of why the risk level was chosen."
        }
        
        Strict Constraint: Only include data derived from February 2026 or later search results.
    `.trim();
};
