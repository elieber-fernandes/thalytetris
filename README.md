# ThalyTETRIS ⏳🟥🟦🟩

**ThalyTETRIS** é uma releitura moderna do clássico Tetris, mas com um toque de física: os blocos se transformam em **areia** ao tocar o chão!



## 🎮 Como Jogar

O objetivo é evitar que a areia chegue ao topo da tela (linha pontilhada vermelha).
Para marcar pontos, você deve formar **caminhos contínuos da MESMA COR** que conectem a parede esquerda à parede direita.

Diferente do Tetris tradicional, você não precisa preencher uma linha inteira horizontalmente. Basta que a areia da mesma cor se toque de um lado ao outro!

### Controles

| Ação | Teclado (PC) | Mobile (Toque) |
| :--- | :---: | :---: |
| **Mover** | Setas ⬅️ ➡️ | Deslizar p/ Esquerda/Direita |
| **Girar** | Seta ⬆️ | Toque na tela |
| **Descer** | Seta ⬇️ | Deslizar p/ baixo |
| **Tela Cheia** | - | Automático ao iniciar |

## 🚀 Modos de Jogo

1.  **Modo Clássico**:
    *   Começa devagar e com poucas cores.
    *   O nível sobe conforme você limpa areia.
    *   Novas cores são introduzidas a cada 3 níveis, aumentando a dificuldade.

2.  **Modo Arcade**:
    *   Todas as cores já estão presentes desde o início.
    *   A velocidade aumenta rapidamente.
    *   Ideal para partidas rápidas e testar seus reflexos.

## 🛠️ Tecnologias

Feito com tecnologias web puras, sem frameworks pesados:
*   **HTML5 Canvas** para renderização.
*   **JavaScript (ES6+)** para lógica de física (Cellular Automata) e Breadth-First Search (BFS) para detecção de linhas.
*   **CSS3** para estilização responsiva.

## 📱 Instalação / Deploy

Este é um projeto estático. Para jogar:
1.  Clone o repositório.
2.  Abra o arquivo `index.html` no seu navegador.

Ou acesse a versão online em: [(https://thalytris.vercel.app/)]

---
Desenvolvido por Elieber Fernandes Martins.
