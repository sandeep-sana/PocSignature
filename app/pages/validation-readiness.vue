<template>
  <div class="poc-page validation-page">
    <div class="page-header">
      <span class="demo-badge">7</span>
      <div class="header-text">
        <h1>Validation Readiness</h1>
        <p class="compliance-line">Delivered post-PO as validation package — URS, IQ/OQ/PQ templates, Traceability Matrix.</p>
      </div>
    </div>

    <div class="slide-card">
      <p class="positioning">This is a representative demo. Upon order, the system is configured, qualified, and validated as per your URS and risk profile.</p>

      <div class="templates">
        <h2>Templates (post-PO)</h2>
        <ul>
          <li><strong>URS template</strong> — User Requirement Specification</li>
          <li><strong>IQ/OQ/PQ templates</strong> — Installation, Operational, Performance Qualification</li>
          <li><strong>Traceability Matrix</strong> — Requirements ↔ Design ↔ Test ↔ Risk</li>
        </ul>
      </div>

      <div class="mapping">
        <h2>Simple mapping (verbal)</h2>
        <table class="map-table">
          <thead>
            <tr>
              <th>What you show</th>
              <th>Regulation covered</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Login + roles</td><td>Part 11, Annex 11</td></tr>
            <tr><td>Signature with meaning</td><td>Part 11</td></tr>
            <tr><td>Audit trail</td><td>Part 11, GAMP</td></tr>
            <tr><td>Versioning</td><td>Data Integrity</td></tr>
            <tr><td>Validation templates</td><td>GAMP 5</td></tr>
          </tbody>
        </table>
      </div>

      <p class="one-line">For pre-PO demo, focus only: Login → Create Record → Sign → Audit Trail → Version → Validation Templates.</p>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.poc-page { max-width: 800px; margin: 0 auto; padding: 1rem 0; }
.page-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; }
.demo-badge { flex-shrink: 0; width: 2rem; height: 2rem; background: #22c55e; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; }
.header-text { flex: 1; min-width: 0; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem 0; }
.compliance-line { color: #64748b; font-size: 0.9rem; margin: 0; }
.slide-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem 2rem; }
.positioning { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; color: #166534; font-size: 0.9rem; margin-bottom: 1.5rem; }
.templates h2, .mapping h2 { font-size: 1rem; font-weight: 600; color: #0f172a; margin-bottom: 0.75rem; }
.templates ul { margin: 0 0 1.25rem 0; padding-left: 1.25rem; color: #475569; line-height: 1.7; }
.map-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-bottom: 1.25rem; }
.map-table th, .map-table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #f1f5f9; }
.map-table th { background: #f8fafc; font-weight: 600; color: #334155; }
.one-line { font-size: 0.9rem; color: #64748b; margin: 0; padding-top: 1rem; border-top: 1px solid #e2e8f0; }
</style>
