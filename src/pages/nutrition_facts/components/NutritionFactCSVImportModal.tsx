import { useState, useRef } from 'react';
import { Button } from '../../../components/ui';
import { apiService } from '../../../services/api.service';
import './NutritionFactCSVImportModal.css';

interface CSVRowError {
  row: number;
  field?: string;
  message: string;
  value?: any;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: CSVRowError[];
}

interface ValidateResult {
  valid: boolean;
  errors: CSVRowError[];
  totalRows: number;
}

interface NutritionFactCSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export function NutritionFactCSVImportModal({ isOpen, onClose, onImportSuccess }: NutritionFactCSVImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidateResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'upload' | 'validate' | 'import' | 'complete'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Por favor selecciona un archivo CSV válido');
      return;
    }

    const validMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (file.type && !validMimeTypes.includes(file.type)) {
      setError('El archivo no tiene un tipo MIME válido para CSV');
      return;
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FILE_SIZE) {
      setError('El archivo excede el tamaño máximo permitido de 5 MB');
      return;
    }

    setSelectedFile(file);
    setError('');

    // Leer el archivo
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;

      // Validar contra CSV injection
      const lines = content.split('\n');
      for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const cells = lines[i].split(',');
        for (const cell of cells) {
          const trimmed = cell.trim().replace(/^["']|["']$/g, '');
          if (/^[=+@\t]/.test(trimmed)) {
            setError('El CSV contiene celdas con caracteres potencialmente peligrosos (=, +, @).');
            setSelectedFile(null);
            return;
          }
        }
      }

      setCsvData(content);
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const template = 'id,name,created_at,updated_at,inspected\n';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_valores_nutricionales.csv';
    link.click();
  };

  const handleValidate = async () => {
    if (!csvData) {
      setError('No hay datos CSV para validar');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const response = await apiService.post<{ success: boolean; data: ValidateResult; error?: string }>('/nutrition-facts/csv/validate', {
        csvContent: csvData
      });

      if (response.success) {
        setValidationResult(response.data);
        setStep('validate');
      } else {
        throw new Error(response.error || 'Error al validar el archivo');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Error al validar el archivo';
      setError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!csvData) {
      setError('No hay datos CSV para importar');
      return;
    }

    setIsImporting(true);
    setError('');

    try {
      const response = await apiService.post<{ success: boolean; data: ImportResult; error?: string }>('/nutrition-facts/csv/import', {
        csvContent: csvData
      });

      if (response.success) {
        setImportResult(response.data);
        setStep('complete');
        
        // Llamar a onImportSuccess para recargar valores nutricionales
        if (response.data.success) {
          setTimeout(() => {
            onImportSuccess();
          }, 2000);
        }
      } else {
        throw new Error(response.error || 'Error al importar el archivo');
      }
    } catch (err: any) {
      setError(err.message || 'Error al importar el archivo');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setCsvData('');
    setValidationResult(null);
    setImportResult(null);
    setError('');
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="nutrition-fact-csv-import-modal">
        <div className="modal-header">
          <h2>Importar Valores Nutricionales desde CSV</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {step === 'upload' && (
            <div className="upload-step">
              <div className="form-group">
                <label>Seleccionar archivo CSV</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="file-input"
                />
                {selectedFile && (
                  <p className="file-info">Archivo seleccionado: {selectedFile.name}</p>
                )}
              </div>

              <div className="csv-info">
                <h3>Formato del archivo CSV</h3>
                <p>El archivo debe contener las siguientes columnas obligatorias en este orden exacto:</p>
                <ul>
                  <li><strong>id</strong>: UUID único del valor nutricional</li>
                  <li><strong>name</strong>: Nombre del valor nutricional (ej: Proteínas, Vitamina A, Sodio)</li>
                  <li><strong>created_at</strong>: Fecha de creación (formato: YYYY-MM-DD HH:MM:SS)</li>
                  <li><strong>updated_at</strong>: Fecha de actualización (formato: YYYY-MM-DD HH:MM:SS)</li>
                  <li><strong>inspected</strong>: Estado de verificación (<strong>0</strong> = no verificado, <strong>1</strong> = verificado)</li>
                </ul>
                <div className="important-note">
                  <p><strong>⚠️ Importante:</strong></p>
                  <ul>
                    <li>El campo <strong>inspected</strong> solo acepta valores <strong>0</strong> o <strong>1</strong></li>
                    <li>El campo <strong>id</strong> debe ser único. No se permiten IDs duplicados en el CSV ni IDs que ya existan en la base de datos</li>
                    <li>Si un ID ya existe, se mostrará un error específico indicando el ID duplicado</li>
                    <li>No se generan IDs automáticamente. Todos los IDs deben ser proporcionados explícitamente</li>
                  </ul>
                </div>
                <div className="template-button">
                  <Button variant="secondary" onClick={handleDownloadTemplate}>
                    Descargar Plantilla CSV
                  </Button>
                </div>
              </div>

              <div className="modal-actions">
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isValidating}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleValidate}
                  disabled={!selectedFile || isValidating}
                >
                  {isValidating ? 'Validando...' : 'Validar Archivo'}
                </Button>
              </div>
            </div>
          )}

          {step === 'validate' && validationResult && (
            <div className="validation-step">
              <div className="validation-summary">
                <h3>Resultado de la Validación</h3>
                <div className="summary-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total de filas:</span>
                    <span className="stat-value">{validationResult.totalRows}</span>
                  </div>
                  <div className="stat-item success">
                    <span className="stat-label">Filas válidas:</span>
                    <span className="stat-value">{validationResult.valid ? validationResult.totalRows : validationResult.totalRows - validationResult.errors.length}</span>
                  </div>
                  <div className="stat-item error">
                    <span className="stat-label">Filas con errores:</span>
                    <span className="stat-value">{validationResult.errors.length}</span>
                  </div>
                </div>
              </div>

              {validationResult.errors.length > 0 && (
                <div className="validation-errors">
                  <h4>Errores encontrados:</h4>
                  <div className="errors-list">
                    {validationResult.errors.slice(0, 20).map((error, index) => (
                      <div key={index} className="error-item">
                        <strong>Fila {error.row}</strong>
                        {error.field && ` - Campo: ${error.field}`}
                        {' - '}{error.message}
                        {error.value !== undefined && ` (Valor: "${error.value}")`}
                      </div>
                    ))}
                    {validationResult.errors.length > 20 && (
                      <p className="more-errors">
                        Y {validationResult.errors.length - 20} errores más...
                      </p>
                    )}
                  </div>
                  <p className="warning-message">
                    ⚠️ Por favor corrige los errores antes de importar
                  </p>
                </div>
              )}

              <div className="modal-actions">
                <Button
                  variant="secondary"
                  onClick={() => setStep('upload')}
                >
                  Volver
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!validationResult.valid || isImporting}
                >
                  {isImporting ? 'Importando...' : 'Importar Valores Nutricionales'}
                </Button>
              </div>
            </div>
          )}

          {step === 'complete' && importResult && (
            <div className="import-complete">
              <h3>Importación Completada</h3>
              <div className="import-summary">
                <div className="summary-item success">
                  <span className="summary-icon">✓</span>
                  <span className="summary-text">{importResult.successCount} valores nutricionales importados correctamente</span>
                </div>
                {importResult.errorCount > 0 && (
                  <div className="summary-item error">
                    <span className="summary-icon">✗</span>
                    <span className="summary-text">{importResult.errorCount} valores nutricionales fallaron</span>
                  </div>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="import-errors">
                  <h4>Detalles de errores:</h4>
                  <div className="errors-list">
                    {importResult.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="error-item">
                        <strong>Fila {error.row}:</strong> {error.message}
                      </div>
                    ))}
                    {importResult.errors.length > 10 && (
                      <p className="more-errors">
                        Y {importResult.errors.length - 10} errores más...
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <Button onClick={handleClose}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
