# TF07 — matriz OBSERVADA de acesso (código HTTP por perfil)

Observada, não aprovada: a matriz de perfis "ainda a documentar" (Apêndice A). 403 = recusado pelo perfil; 2xx = aceito; 4xx/5xx diferentes de 403 podem ser regra de negócio ou dado (a operação passou pela checagem de perfil). Sem login: GET /fila → 401.
As operações rodam em sequência no mesmo paciente fictício, então alguns 400/404/409 refletem o estado deixado pelas anteriores.

| Operação | recepcionista | enfermeiro | médico |
|---|---|---|---|
| GET /fila | 200 | 200 | 200 |
| POST /patients (cadastrar) | 201 | 201 | 201 |
| GET /patients | 200 | 200 | 200 |
| POST /sinais/:id | 403 | 201 | 201 |
| GET /patients/:id/vitals | 403 | 200 | 200 |
| PUT /fila/:id (iniciar triagem) | 403 | 200 | 200 |
| PUT /fila/:id (classificar cor) | 403 | 200 | 403 |
| PUT /fila/:id (status Alta) | 403 | 403 | 200 |
| GET /patients/:id/eventos | 403 | 200 | 200 |
| POST /patients/:id/chat (IA) | 403 | 201 | 201 |
| GET /metricas | 200 | 200 | 200 |
| PATCH /patients/:id/visitas/fechar | 403 | 403 | 200 |
| PATCH /fila/:id/alta | 403 | 403 | 204 |
| DELETE /fila/:id | 403 | 403 | 404 |
