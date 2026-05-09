export function updateScoreboard(scoreboardEl, allCars, score) {
    const sortedCars = [...allCars].sort((a, b) => b.score - a.score);
    
    let blueTeamHTML = `<div class="scoreboard-team-label blue">EQUIPO AZUL - ${score.blue}</div>`;
    let orangeTeamHTML = `<div class="scoreboard-team-label orange">EQUIPO NARANJA - ${score.orange}</div>`;

    sortedCars.forEach(car => {
        const carHTML = `
            <div class="scoreboard-player ${car.color === '#5ad' ? 'blue' : 'orange'}">
                <span>${car.name}</span>
                <span>${car.score}</span>
                <span>${car.goals}</span>
                <span>${car.assists}</span>
            </div>
        `;
        if (car.color === '#5ad') {
            blueTeamHTML += carHTML;
        } else {
            orangeTeamHTML += carHTML;
        }
    });

    scoreboardEl.innerHTML = `
        <div class="scoreboard-header">
            <span>JUGADOR</span>
            <span>PUNTOS</span>
            <span>GOLES</span>
            <span>ASIST.</span>
        </div>
        ${blueTeamHTML}
        ${orangeTeamHTML}
    `;
}

export function showScoreboard(scoreboardEl, allCars, score) {
    updateScoreboard(scoreboardEl, allCars, score);
    scoreboardEl.style.display = 'flex';
}

export function hideScoreboard(scoreboardEl, gameState) {
    if (gameState !== 'gameOver') {
        scoreboardEl.style.display = 'none';
    }
}
