# 🏛️ Gestor Parlamento Jovem

Sistema de gestão e avaliação de candidatos para o Parlamento Jovem - Projeto de Literacia Financeira. 

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)

## 📋 Sobre o Projeto

Esta aplicação foi desenvolvida para facilitar o processo de seleção de candidatos ao Parlamento Jovem, oferecendo:

- **Gestão de Candidatos**: Registo e acompanhamento de 10 candidatos
- **Sistema de Entrevistas**: 10 perguntas estruturadas com cronómetro integrado
- **Avaliação por Rubrica**: Escala de 0-4 com descrições claras
- **Rankings por Perfil**: Classificação automática para diferentes funções
- **Geração de Lista Final**: Sugestão automática baseada nos scores

## 🎯 Perfis Avaliados

| Perfil | Descrição |
|--------|-----------|
| **Porta-voz** | Comunicação clara e liderança |
| **Debatedor** | Capacidade de argumentação e defesa |
| **Técnico** | Conhecimento e execução |
| **Redator** | Escrita e planeamento |
| **Organização** | Gestão e coordenação |

## 🚀 Começar

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- npm ou yarn

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/Gustavo-Visual/ParlamentoJovem-Software.git

# Entrar no diretório
cd ParlamentoJovem-Software

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

### Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Cria a versão de produção |
| `npm run preview` | Pré-visualiza a versão de produção |
| `npm run deploy` | Faz deploy para GitHub Pages |

## 🛠️ Tecnologias

- **[React 18](https://react.dev/)** - Biblioteca UI
- **[Vite](https://vitejs.dev/)** - Build tool e dev server
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework CSS
- **[Lucide React](https://lucide.dev/)** - Ícones

## 📱 Funcionalidades

### 1. Configuração do Projeto
- Definir nome do projeto e escola/turma
- Registar os 10 candidatos com validação de duplicados

### 2. Entrevistas
- **Perguntas Principais (1-3)**: Comunicação e clareza (45 segundos)
- **Perguntas de Debate (4-7)**: Ataque e defesa (30 segundos)
- **Perguntas de Suporte (8-10)**: Execução e planeamento (60-120 segundos)

### 3. Avaliação
- Rubrica de 0-4:
  - **0**: Não responde / Erra / Sem estrutura
  - **1**: Fraco (vago, confuso)
  - **2**: Aceitável (ideia certa, pouco clara)
  - **3**: Bom (claro, correto, com exemplo)
  - **4**: Excelente (curto, convincente, aplicável)

### 4. Resultados
- Rankings automáticos por perfil
- Tabela comparativa completa
- Geração de lista final ordenada
- Exportação para PDF

## 💾 Persistência

Os dados são automaticamente guardados no `localStorage` do navegador, permitindo continuar o trabalho mesmo após fechar a aplicação.

## 🌐 Demo

A aplicação está disponível em: [GitHub Pages](https://gustavo-visual.github.io/ParlamentoJovem-Software/)

## 📄 Licença

Este projeto está sob licença privada.

## 👤 Autor

**Gustavo-Visual**

- GitHub: [@Gustavo-Visual](https://github.com/Gustavo-Visual)