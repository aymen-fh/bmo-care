/**
 * Initialize Dashboard Charts
 * @param {Object} data - The data object containing statistics
 */
function initDashboardCharts(data) {
    if (!data) return;

    // 1. User Growth Chart (Line Chart)
    const growthCtx = document.getElementById('userGrowthChart');
    if (growthCtx) {
        new Chart(growthCtx, {
            type: 'line',
            data: {
                labels: data.months || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Parents',
                    data: data.parentsGrowth || [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Children',
                    data: data.childrenGrowth || [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'النمو الشهري' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    // 2. User Distribution (Doughnut Chart)
    const distCtx = document.getElementById('userDistributionChart');
    if (distCtx) {
        new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: ['أخصائيون', 'أولياء أمور', 'مدراء'],
                datasets: [{
                    data: [data.specialistsCount, data.parentsCount, data.adminsCount],
                    backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                },
                cutout: '70%'
            }
        });
    }

    // 3. Children Gender (Pie Chart)
    const genderCtx = document.getElementById('genderChart');
    if (genderCtx && data.genderStats) {
        new Chart(genderCtx, {
            type: 'pie',
            data: {
                labels: ['ذكور', 'إناث'],
                datasets: [{
                    data: [data.genderStats.male, data.genderStats.female],
                    backgroundColor: ['#3b82f6', '#ec4899'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    title: { display: true, text: 'توزيع الطلاب حسب الجنس' }
                }
            }
        });
    }
}
