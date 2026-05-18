/**
 * Modal para importación de productos desde CSV
 */
import { useState, useRef } from 'react';
import { Button } from '../../../components/ui';
import { apiService } from '../../../services/api.service';
import './CsvImportModal.css';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
};

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (csvData: string, delimiter: string) => Promise<void>;
}

interface ValidationResult {
  valid: boolean;
  errors: Array<{ row: number; field: string; message: string }>;
  validRows: number;
  totalRows: number;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export function CsvImportModal({ isOpen, onClose, onImport }: CsvImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState<string>(',');
  const [customDelimiter, setCustomDelimiter] = useState<string>('');
  const [csvData, setCsvData] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
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

    // Validar MIME type
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

      // Validar contra CSV injection (fórmulas maliciosas) en TODAS las líneas
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const cells = lines[i].split(',');
        for (const cell of cells) {
          const trimmed = cell.trim().replace(/^["']|["']$/g, '');
          if (/^[=+@\t]/.test(trimmed)) {
            setError(`El CSV contiene celdas con caracteres potencialmente peligrosos (=, +, @) en la fila ${i + 1}. Por favor revisa el contenido.`);
            setSelectedFile(null);
            return;
          }
        }
      }

      setCsvData(content);
    };
    reader.readAsText(file);
  };

  const handleDelimiterChange = (value: string) => {
    setDelimiter(value);
    if (value !== 'custom') {
      setCustomDelimiter('');
    }
  };

  const getDelimiterValue = (): string => {
    if (delimiter === 'custom') {
      return customDelimiter;
    }
    return delimiter;
  };

  const handleValidate = async () => {
    if (!csvData) {
      setError('No hay datos CSV para validar');
      return;
    }

    const delimiterValue = getDelimiterValue();
    if (!delimiterValue) {
      setError('Por favor selecciona o ingresa un separador');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const response = await apiService.post<ApiResponse<ValidationResult>>('/products/validate-csv', {
        csvData,
        delimiter: delimiterValue
      });

      if (response.success) {
        setValidationResult(response.data);
        setStep('validate');
      } else {
        throw new Error(response.error || 'Error al validar el archivo');
      }
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error en validación:', err);
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
      const response = await apiService.post<ApiResponse<ImportResult>>('/products/import-csv', {
        csvData,
        delimiter: getDelimiterValue()
      });

      if (response.success) {
        setImportResult(response.data);
        setStep('complete');
        
        // Llamar a onImport para recargar productos
        await onImport(csvData, getDelimiterValue());
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
    setDelimiter(',');
    setCustomDelimiter('');
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
      <div className="csv-import-modal">
        <div className="modal-header">
          <h2>Importar Productos desde CSV</h2>
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

              <div className="form-group">
                <label>Separador de columnas</label>
                <select
                  value={delimiter}
                  onChange={(e) => handleDelimiterChange(e.target.value)}
                  className="delimiter-select"
                >
                  <option value=",">Coma (,)</option>
                  <option value=";">Punto y coma (;)</option>
                  <option value="|">Barra vertical (|)</option>
                  <option value="\t">Tabulación</option>
                  <option value="-">Guión (-)</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              {delimiter === 'custom' && (
                <div className="form-group">
                  <label>Separador personalizado</label>
                  <input
                    type="text"
                    value={customDelimiter}
                    onChange={(e) => setCustomDelimiter(e.target.value)}
                    placeholder="Ingresa el separador"
                    maxLength={1}
                    className="custom-delimiter-input"
                  />
                </div>
              )}

              <div className="csv-info">
                <h3>Formato del archivo CSV</h3>
                <p>El archivo debe contener las siguientes columnas obligatorias:</p>
                <ul>
                  <li><strong>name</strong>: Nombre del producto</li>
                  <li><strong>brand</strong>: Marca</li>
                  <li><strong>barcode</strong>: Código de barras</li>
                  <li><strong>unitMeasure</strong>: Unidad de medida</li>
                  <li><strong>unitMultiplier</strong>: Multiplicador (número mayor a 0)</li>
                  <li><strong>category</strong>: Categoría</li>
                  <li><strong>inspected</strong>: Estado de validación (0 = no validado, 1 = validado)</li>
                </ul>
                <p className="note">Nota: El código de barras se normalizará automáticamente si termina en .0</p>
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
                  disabled={!selectedFile || isValidating || (delimiter === 'custom' && !customDelimiter)}
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
                    <span className="stat-value">{validationResult.validRows}</span>
                  </div>
                  <div className="stat-item error">
                    <span className="stat-label">Filas con errores:</span>
                    <span className="stat-value">{validationResult.errors.length > 0 ? validationResult.totalRows - validationResult.validRows : 0}</span>
                  </div>
                </div>
              </div>

              {validationResult.errors.length > 0 && (
                <div className="validation-errors">
                  <h4>Errores encontrados:</h4>
                  <div className="errors-list">
                    {validationResult.errors.slice(0, 20).map((error, index) => (
                      <div key={index} className="error-item">
                        <strong>Fila {error.row}</strong> - Campo: {error.field} - {error.message}
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
                  {isImporting ? 'Importando...' : 'Importar Productos'}
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
                  <span className="summary-text">{importResult.success} productos importados correctamente</span>
                </div>
                {importResult.failed > 0 && (
                  <div className="summary-item error">
                    <span className="summary-icon">✗</span>
                    <span className="summary-text">{importResult.failed} productos fallaron</span>
                  </div>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="import-errors">
                  <h4>Detalles de errores:</h4>
                  <div className="errors-list">
                    {importResult.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="error-item">
                        <strong>Fila {error.row}:</strong> {error.error}
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
