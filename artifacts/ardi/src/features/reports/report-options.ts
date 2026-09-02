import type { ReportInputFormat, ReportInputType } from '@workspace/api-client-react';

export const reportTypeLabels: Record<ReportInputType, string> = {
  executive: 'Executive summary',
  technical: 'Technical report',
  compliance: 'Compliance evidence report',
  pentest: 'Pen Test report',
};

export const reportFormatLabels: Record<ReportInputFormat, string> = {
  pdf: 'Print-ready document',
  html: 'HTML',
  json: 'JSON',
};
