/**
 * "¿Cómo se evalúan?": la lógica general de metas y embarazo en un solo lugar (los detalles de cada
 * meta están en su modal: umbrales, fuentes y atributos). Los colores son los mismos de la app.
 */
import { Button, Modal } from '../../../components/ui';

interface GoalsHelpModalProps {
  show: boolean;
  onClose: () => void;
}

const RESULTS: { dot: string; label: string; when: string; effect: string }[] = [
  {
    dot: 'goal-help-dot--red',
    label: 'Va en contra',
    when: 'Exceso según la tabla, octógono del envase, o un ingrediente que cuenta para la meta entre los primeros de la lista.',
    effect: 'El producto queda en Precaución.',
  },
  {
    dot: 'goal-help-dot--orange',
    label: 'Aviso',
    when: 'Tiene algo de lo que la meta busca reducir, pero sin llegar al exceso (o el ingrediente está más abajo en la lista).',
    effect: 'No cambia el estado: queda APTO (pero no Recomendado).',
  },
  {
    dot: 'goal-help-dot--green',
    label: 'Te ayuda',
    when: 'Mucha proteína o fibra, o muy poca cantidad de lo que la meta busca reducir (según la tabla).',
    effect: 'Puede quedar Recomendado, si además el puntaje es 80 o más y ninguna meta va en contra.',
  },
  {
    dot: 'goal-help-dot--grey',
    label: 'No aplica',
    when: 'Productos para infusión o para preparar (café, yerba, gelatina en polvo): su tabla describe el producto seco o sin preparar, no lo que se consume.',
    effect: 'No cambia el estado. Si el envase tiene octógono, ese sí cuenta.',
  },
  {
    dot: 'goal-help-dot--grey',
    label: 'Sin datos',
    when: 'No hay tabla, ni octógono, ni ingredientes que alcancen para evaluarla.',
    effect: 'No cambia el estado.',
  },
];

export function GoalsHelpModal({ show, onClose }: GoalsHelpModalProps) {
  if (!show) return null;
  return (
    <Modal show title="¿Cómo se evalúan las metas y el embarazo?" onClose={onClose} maxWidth="760px" className="page-goals">
      <div className="modal-body goal-help">
        <section>
          <h3 className="goal-help-title">Metas</h3>
          <p>
            El usuario las elige en la app. Cada meta tiene su regla en el código; acá se ajustan los textos, los umbrales y
            qué atributos cuentan. Para cada producto, la meta usa el primer dato que encuentra:
          </p>
          <ol className="goal-help-steps">
            <li><strong>Tabla nutricional</strong>, cada 100 g (sólidos) o 100 ml (líquidos), contra los umbrales.</li>
            <li><strong>Octógonos</strong> del envase.</li>
            <li>
              <strong>Ingredientes</strong>: variantes con un atributo del rol de la meta (ej. "Fuentes de azúcar" ← Metas ›
              Azúcares), entre los primeros de la lista.
            </li>
          </ol>
        </section>

        <section>
          <h3 className="goal-help-title">Resultados posibles</h3>
          <div className="goal-help-results">
            {RESULTS.map((r) => (
              <div key={r.label} className="goal-help-result">
                <span className={`goal-help-dot ${r.dot}`} aria-hidden />
                <div>
                  <strong>{r.label}</strong>
                  <p>{r.when}</p>
                  <p className="goal-help-effect">{r.effect}</p>
                </div>
              </div>
            ))}
          </div>
          <ul className="goal-help-notes">
            <li>Las metas <strong>nunca</strong> dan No apto: eso lo dan solo las restricciones.</li>
            <li>
              <strong>Evitar ultraprocesados</strong> usa el criterio NOVA 4: ingredientes industriales o aditivos como
              colorantes y saborizantes. La cantidad de ingredientes no cuenta.
            </li>
            <li>Si los datos del producto todavía no fueron validados, la app lo aclara.</li>
          </ul>
        </section>

        <section>
          <h3 className="goal-help-title">Embarazo</h3>
          <p>
            No es una meta: es una <strong>restricción de sistema</strong> que se suma sola a quien marcó embarazo en su
            perfil (no aparece en la lista de restricciones de la app y no se puede borrar).
          </p>
          <ul className="goal-help-notes">
            <li>
              Un ingrediente con alguno de sus atributos (alcohol, cafeína, carne cruda o curada, sin pasteurizar, pescado
              con mercurio, hígado), en cualquier lugar de la lista → <strong>Precaución</strong>.
            </li>
            <li>Un producto alcohólico (por su graduación) → <strong>No apto</strong>.</li>
          </ul>
        </section>
      </div>
      <div className="modal-footer">
        <Button variant="outline" onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  );
}
