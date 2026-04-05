import { jsPDF } from 'jspdf';
import type { Patient, PatientSession } from './types';

const WELLBEING_LABELS: Record<number, string> = {
  1: 'Muy mal', 2: 'Mal', 3: 'Regular', 4: 'Bien', 5: 'Muy bien',
};

function addSection(doc: jsPDF, title: string, y: number, margin: number): number {
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text(title, margin, y);
  return y + 6;
}

function addBody(doc: jsPDF, text: string, y: number, margin: number, contentWidth: number): number {
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  const lines = doc.splitTextToSize(text, contentWidth);
  for (const line of lines) {
    if (y > 275) { doc.addPage(); y = 20; }
    doc.text(line, margin, y);
    y += 4.5;
  }
  return y + 2;
}

export function exportSessionPDF(patient: Patient, session: PatientSession): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // ── Header ──
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Tu Primer Paso', margin, y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140, 140, 140);
  doc.text('Resumen ejecutivo para profesional de salud mental', margin, y + 5);
  y += 12;
  doc.setDrawColor(210, 210, 210);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Patient Demographics ──
  y = addSection(doc, 'Datos del paciente', y, margin);
  const demographics = [
    `Nombre: ${patient.name}`,
    `Edad: ${patient.age} años · Género: ${patient.gender}`,
    `Estado civil: ${patient.maritalStatus} · Vive: ${patient.livingSituation}`,
    `Ocupación: ${patient.employment}${patient.occupation ? ` (${patient.occupation})` : ''}`,
    `Red de apoyo: ${patient.hasSupportNetwork ? 'Sí' : 'No'}${patient.supportDescription ? ` — ${patient.supportDescription}` : ''}`,
    `Terapia previa: ${patient.previousTherapy ? 'Sí' : 'No'}${patient.previousTherapyDetail ? ` — ${patient.previousTherapyDetail}` : ''}`,
    `Medicación: ${patient.takingMedication ? 'Sí' : 'No'}${patient.medicationDetail ? ` — ${patient.medicationDetail}` : ''}`,
  ];
  for (const line of demographics) {
    y = addBody(doc, line, y, margin, contentWidth);
  }
  y += 2;

  // ── Motivo de consulta ──
  y = addSection(doc, 'Motivo de consulta', y, margin);
  y = addBody(doc, patient.consultationReason, y, margin, contentWidth);
  y += 2;

  // ── Session info ──
  const sessionDate = new Date(session.createdAt).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  y = addSection(doc, `Sesión ${session.sessionNumber} — ${sessionDate}`, y, margin);

  // ── Wellbeing ──
  if (session.wellbeingBefore || session.wellbeingAfter) {
    const parts: string[] = [];
    if (session.wellbeingBefore) parts.push(`Inicio: ${WELLBEING_LABELS[session.wellbeingBefore]} (${session.wellbeingBefore}/5)`);
    if (session.wellbeingAfter) parts.push(`Final: ${WELLBEING_LABELS[session.wellbeingAfter]} (${session.wellbeingAfter}/5)`);
    y = addBody(doc, `Bienestar subjetivo: ${parts.join('  ·  ')}`, y, margin, contentWidth);
    y += 2;
  }

  // ── Frameworks ──
  if (session.frameworkMatches.length > 0) {
    y = addSection(doc, 'Marcos terapéuticos identificados', y, margin);
    for (const fm of session.frameworkMatches) {
      y = addBody(doc, `• ${fm.name} (${fm.role}) — ${fm.focus}`, y, margin, contentWidth);
    }
    y += 2;
  }

  // ── Conflicts ──
  if (session.conflicts.length > 0) {
    y = addSection(doc, 'Conflictos identificados', y, margin);
    for (const c of session.conflicts) {
      y = addBody(doc, `• ${c.synthesized} — ${c.subCategory}`, y, margin, contentWidth);
    }
    y += 2;
  }

  // ── Interpretation ──
  if (session.interpretation) {
    y = addSection(doc, 'Interpretación clínica (generada por IA)', y, margin);
    const text = session.interpretation.text.length > 800
      ? session.interpretation.text.slice(0, 800) + '...'
      : session.interpretation.text;
    y = addBody(doc, text, y, margin, contentWidth);
    y += 2;
  }

  // ── Strategies ──
  if (session.closure?.strategies && session.closure.strategies.length > 0) {
    y = addSection(doc, 'Estrategias sugeridas', y, margin);
    for (const s of session.closure.strategies) {
      y = addBody(doc, `• ${s.title}: ${s.description}`, y, margin, contentWidth);
    }
  }

  // ── Footer disclaimer ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      'Este documento fue generado por Tu Primer Paso, una herramienta de apoyo emocional asistida por IA. No reemplaza el diagnóstico profesional.',
      margin, footerY,
      { maxWidth: contentWidth },
    );
  }

  // Save
  const safeName = patient.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
  doc.save(`primer-paso_${safeName}_sesion-${session.sessionNumber}.pdf`);
}
