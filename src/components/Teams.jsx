import { useState } from 'react';
import { details } from '../data/content.js';
import '../styles/teams.css';

const pad = (n) => String(n).padStart(2, '0');

/*
  OUR TEAM (Our Details): the four people, each with their jobs, weekly output and the number they
  track; then how a film project and an audio project run, step by step, and who does each step.
  The two halves answer each other under the pointer: pointing at a person lights the steps they work
  on in both flows, and pointing at a step lights the people on it. Everything is also written out in
  full, so nothing depends on the pointer (touch screens and the keyboard read it as it stands).
*/
export default function Teams() {
  // who is lit (names) and, when a step is pointed at, which one
  const [lit, setLit] = useState({ names: [], step: null });
  const mouse = (fn) => (e) => {
    if (e.pointerType === 'mouse') fn();
  };
  const clear = () => setLit({ names: [], step: null });
  const on = lit.names.length > 0;

  return (
    <section className="teams">
      <div className="wrap">
        <header className="d-head">
          <div className="sr">
            <h2 className="label rust">{details.teamLabel}</h2>
            <p className="d-title display">{details.teamTitle}</p>
          </div>
          <p className="d-intro sr">{details.teamIntro}</p>
        </header>

        <ul className={`tm-grid${on ? ' has-on' : ''}`}>
          {details.team.map((m, i) => (
            <li
              className={`tm sr${lit.names.includes(m.name) ? ' on' : ''}`}
              key={m.name}
              style={{ '--i': i }}
              onPointerEnter={mouse(() => setLit({ names: [m.name], step: null }))}
              onPointerLeave={clear}
            >
              <div className="tm-head">
                <span className="tm-mono display" aria-hidden="true">
                  {m.name[0]}
                </span>
                <div>
                  <h3 className="tm-name display">{m.name}</h3>
                  <p className="tm-role">{m.role}</p>
                </div>
              </div>
              <dl className="tm-list">
                <div>
                  <dt className="label">Jobs and tasks</dt>
                  <dd>{m.jobs}</dd>
                </div>
                <div>
                  <dt className="label">Weekly output</dt>
                  <dd>{m.output}</dd>
                </div>
                <div className="tm-track">
                  <dt className="label">Number to track</dt>
                  <dd>{m.track}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <div className={`fl-grid${on ? ' has-on' : ''}`}>
          {details.flows.map((flow) => (
            <div className="fl sr" key={flow.title}>
              <h3 className="fl-title display">{flow.title}</h3>
              <ol className="fl-steps">
                {flow.steps.map((s, i) => {
                  const key = `${flow.title}/${i}`;
                  const lightUp = lit.step ? lit.step === key : s.people.some((p) => lit.names.includes(p));
                  return (
                    <li
                      className={`fl-step${lightUp ? ' on' : ''}`}
                      key={key}
                      style={{ '--i': i }}
                      onPointerEnter={mouse(() => setLit({ names: s.people, step: key }))}
                      onPointerLeave={clear}
                    >
                      <span className="fl-n label" aria-hidden="true">
                        {pad(i + 1)}
                      </span>
                      <div className="fl-body">
                        <h4 className="fl-name">
                          <span className="sr-only">Step {i + 1}: </span>
                          {s.step}
                        </h4>
                        <p className="fl-result">{s.result}</p>
                      </div>
                      <p className="fl-who">
                        <span className="sr-only">Who: </span>
                        {s.who}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
