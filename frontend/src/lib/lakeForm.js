export const emptyLakeForm = {
  name: '',
  acreage: '',
  maxDepthFeet: '',
  avgDepthFeet: '',
  waterClarity: '',
  edgeType: '',
  notes: '',
  dnrSourceUrl: '',
};

export function lakeToFormValues(lake) {
  return {
    name: lake.name || '',
    acreage: lake.acreage != null ? String(lake.acreage) : '',
    maxDepthFeet: lake.maxDepthFeet != null ? String(lake.maxDepthFeet) : '',
    avgDepthFeet: lake.avgDepthFeet != null ? String(lake.avgDepthFeet) : '',
    waterClarity: lake.waterClarity || '',
    edgeType: lake.edgeType || '',
    notes: lake.notes || '',
    dnrSourceUrl: lake.dnrSourceUrl || '',
  };
}

export function formValuesToLakePayload(form) {
  return {
    name: form.name,
    acreage: form.acreage ? Number(form.acreage) : null,
    maxDepthFeet: form.maxDepthFeet ? Number(form.maxDepthFeet) : null,
    avgDepthFeet: form.avgDepthFeet ? Number(form.avgDepthFeet) : null,
    waterClarity: form.waterClarity || null,
    edgeType: form.edgeType || null,
    notes: form.notes || null,
    dnrSourceUrl: form.dnrSourceUrl || null,
  };
}

export function dnrFieldsToFormValues(fields) {
  return {
    name: fields.name || '',
    acreage: fields.acreage != null ? String(fields.acreage) : '',
    maxDepthFeet: fields.maxDepthFeet != null ? String(fields.maxDepthFeet) : '',
    avgDepthFeet: fields.avgDepthFeet != null ? String(fields.avgDepthFeet) : '',
    waterClarity: fields.waterClarity || '',
    edgeType: fields.edgeType || '',
    notes: fields.notes || '',
    dnrSourceUrl: fields.dnrSourceUrl || '',
  };
}
