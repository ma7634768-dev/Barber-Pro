# Barber Pro

Sistema de agendamento e gestão para barbearias: página pública onde o cliente marca horário e painel do dono com agenda, barbeiros, serviços e clientes.

Feito com React + Vite + TypeScript + Tailwind, e Supabase (banco, login e atualização em tempo real).

## Rodar no computador

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No Supabase, abra **SQL Editor**, cole o conteúdo de `supabase/migrations/20261024000000_init.sql` e rode.
3. O projeto já vem ligado ao Supabase do Barber Pro pelo arquivo `.env.production` (a chave publishable é pública por natureza). Para usar outro projeto, copie `.env.example` para `.env.local` e preencha.
4. Rode:

```bash
npm install
npm run dev
```

O site abre em http://localhost:8080.

## Páginas

| Endereço | O que é |
| --- | --- |
| `/` | Página inicial |
| `/entrar` | Login e cadastro do dono |
| `/comecar` | Configuração inicial da barbearia (primeiro acesso) |
| `/painel` | Visão geral do dia |
| `/painel/agenda` | Agenda por barbeiro, com confirmar, concluir e cancelar |
| `/painel/barbeiros`, `/painel/servicos`, `/painel/clientes` | Cadastros |
| `/painel/configuracoes` | Dados e horário de funcionamento |
| `/agendar/:id` | Página pública de agendamento da barbearia |

## Segurança (diferente do projeto original do Lovable)

- A página pública não lê a tabela de agendamentos. Ela só recebe os horários ocupados, pela função `get_busy_slots`, então nome, telefone e e-mail dos clientes ficam privados.
- O cliente agenda pela função `book_appointment`, que confere barbeiro, serviço, horário no futuro e cria o cadastro do cliente.
- O banco recusa dois agendamentos do mesmo barbeiro no mesmo horário.
- E-mail e telefone dos barbeiros não aparecem na página pública.

## Publicar

Funciona em Vercel ou Netlify (os arquivos `vercel.json` e `public/_redirects` já cuidam das rotas). Configure as mesmas variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no painel da hospedagem.

## Mudar as cores

A paleta inteira fica no topo de `src/index.css` (variáveis `--primary`, `--background` etc.).
