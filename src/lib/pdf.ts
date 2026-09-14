import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Aula } from '@/types/database';

type ReportAula = Aula & {
  horario?: { hora_inicio: string; hora_fim: string };
  turma?: { nome: string };
  disciplina?: { nome: string };
  professor?: { nome: string };
};

type ReportOptions = {
  aulas: ReportAula[];
  title: string;
  subtitle: string;
  institutionName: string;
  feriados: { data: string; descricao: string }[];
  eventos: { data_inicio: string; data_fim: string; nome: string }[];
};

function dateInfo(date: string): { day: string; weekday: string; month: string; monthKey: string } {
  const parsed = new Date(`${date}T00:00:00`);
  const weekdays = ['D', '2ª', '3ª', '4ª', '5ª', '6ª', 'S'];
  return {
    day: String(parsed.getDate()).padStart(2, '0'),
    weekday: weekdays[parsed.getDay()],
    month: parsed.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase(),
    monthKey: date.slice(0, 7),
  };
}

export function generatePdfReport(options: ReportOptions): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  const sorted = [...options.aulas].sort((a, b) =>
    `${a.data}|${a.horario?.hora_inicio || ''}`.localeCompare(`${b.data}|${b.horario?.hora_inicio || ''}`),
  );

  // Header
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const instLines = doc.splitTextToSize(options.institutionName, pageWidth - margin * 2);
  doc.text(instLines, margin, 16);

  doc.setFontSize(14);
  doc.text(options.title, margin, 16 + instLines.length * 5 + 4);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(options.subtitle, margin, 16 + instLines.length * 5 + 10);

  let previousMonth = '';
  let previousDate = '';
  let isFirstTable = true;
  let cursorY = 16 + instLines.length * 5 + 16;

  const monthRows: string[][] = [];
  let currentMonthLabel = '';

  function flushMonth() {
    if (monthRows.length === 0) return;
    if (!isFirstTable) {
      cursorY += 4;
      if (cursorY > 270) {
        doc.addPage();
        cursorY = 16;
      }
    }
    isFirstTable = false;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 181, 229);
    doc.text(currentMonthLabel, margin, cursorY);
    cursorY += 2;

    autoTable(doc, {
      startY: cursorY,
      head: [['D.M', 'D.S', 'DISCIPLINA', 'PROFESSOR']],
      body: monthRows,
      theme: 'grid',
      headStyles: {
        fillColor: [17, 17, 17],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        lineColor: [34, 34, 34],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 105 },
        3: { cellWidth: 51 },
      },
      margin: { left: margin, right: margin },
    });

    // jspdf-autotable stores finalY on doc after each table draw
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    if (finalY !== undefined) cursorY = finalY;

    monthRows.length = 0;
  }

  sorted.forEach(aula => {
    const info = dateInfo(aula.data);
    if (info.monthKey !== previousMonth) {
      flushMonth();
      currentMonthLabel = info.month;
      previousMonth = info.monthKey;
      previousDate = '';
    }

    const feriado = options.feriados.find(f => f.data === aula.data);
    const evento = options.eventos.find(e => aula.data >= e.data_inicio && aula.data <= e.data_fim);
    const description = evento?.nome || feriado?.descricao || '';
    const subject = description
      ? `${aula.disciplina?.nome || '—'} — ${description}`
      : aula.disciplina?.nome || '—';
    const firstOfDate = previousDate !== aula.data;

    monthRows.push([
      firstOfDate ? info.day : '',
      firstOfDate ? info.weekday : '',
      subject,
      aula.professor?.nome || '—',
    ]);

    previousDate = aula.data;
  });

  flushMonth();

  if (sorted.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('Nenhuma aula cadastrada no calendário.', margin, cursorY + 6);
  }

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' },
    );
  }

  const safeTitle = options.title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  doc.save(`calendario-ifiteo-${safeTitle}.pdf`);
}
