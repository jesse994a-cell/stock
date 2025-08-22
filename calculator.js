// 存股對沖房貸計算器
class MortgageCalculator {
    constructor() {
        this.dividendMonths = {
            "0056": [1, 4, 7, 10],
            "00878": [2, 5, 8, 11], 
            "00712": [3, 6, 9, 12],
            "00919": [3, 6, 9, 12]
        };
    }

    // 格式化數字顯示
    formatNumber(num) {
        return new Intl.NumberFormat('zh-TW').format(Math.round(num));
    }

    // 格式化金額顯示
    formatCurrency(num) {
        return '$ ' + this.formatNumber(num);
    }

    // 計算月付款金額
    calculateMonthlyPayment(principal, annualRate, years) {
        const monthlyRate = annualRate / 12 / 100;
        const totalMonths = years * 12;
        
        if (monthlyRate === 0) {
            return principal / totalMonths;
        }
        
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
               (Math.pow(1 + monthlyRate, totalMonths) - 1);
    }

    // 主要計算函數
    calculate() {
        // 獲取輸入參數
        const loanAmount = parseFloat(document.getElementById('loanAmount').value) * 10000;
        const annualRate = parseFloat(document.getElementById('interestRate').value);
        const loanYears = parseInt(document.getElementById('loanYears').value);
        
        const initialStocks = {
            "0056": parseInt(document.getElementById('initial0056').value),
            "00878": parseInt(document.getElementById('initial00878').value),
            "00712": parseInt(document.getElementById('initial00712').value),
            "00919": parseInt(document.getElementById('initial00919').value)
        };
        
        const monthlyPurchase = {
            "0056": parseInt(document.getElementById('monthly0056').value),
            "00878": parseInt(document.getElementById('monthly00878').value),
            "00712": parseInt(document.getElementById('monthly00712').value),
            "00919": parseInt(document.getElementById('monthly00919').value)
        };
        
        const stockPrices = {
            "0056": parseFloat(document.getElementById('price0056').value),
            "00878": parseFloat(document.getElementById('price00878').value),
            "00712": parseFloat(document.getElementById('price00712').value),
            "00919": parseFloat(document.getElementById('price00919').value)
        };
        
        const annualGrowth = {
            "0056": parseFloat(document.getElementById('growth0056').value) / 100,
            "00878": parseFloat(document.getElementById('growth00878').value) / 100,
            "00712": parseFloat(document.getElementById('growth00712').value) / 100,
            "00919": parseFloat(document.getElementById('growth00919').value) / 100
        };
        
        const dividends = {
            "0056": parseFloat(document.getElementById('div0056').value),
            "00878": parseFloat(document.getElementById('div00878').value),
            "00712": parseFloat(document.getElementById('div00712').value),
            "00919": parseFloat(document.getElementById('div00919').value)
        };

        // 計算基本參數
        const monthlyRate = annualRate / 12 / 100;
        const totalMonths = loanYears * 12;
        const monthlyPayment = this.calculateMonthlyPayment(loanAmount, annualRate, loanYears);
        
        // 初始化變數
        let remainingBalance = loanAmount;
        let currentStocks = { ...initialStocks };
        let currentStockPrices = { ...stockPrices };
        
        const results = [];
        const chartData = [];
        let totalInterestPaid = 0;
        let totalDividendReceived = 0;
        let totalEarlyPayment = 0;
        let totalStockInvestment = 0;
        let payoffMonth = 0;

        // 添加起始點到圖表
        chartData.push({
            year: 0,
            balance: remainingBalance / 10000,
            totalPaid: 0
        });

        // 逐月計算，最多計算到原始貸款期限
        for (let month = 1; month <= totalMonths; month++) {
            const currentMonth = ((month - 1) % 12) + 1;
            const currentYear = Math.ceil(month / 12);
            
            // 更新股價（年度漲幅）
            if (currentMonth === 1 && month > 1) {
                Object.keys(currentStockPrices).forEach(stock => {
                    currentStockPrices[stock] *= (1 + annualGrowth[stock]);
                });
            }
            
            // 每月購買股票
            let monthlyStockCost = 0;
            Object.keys(monthlyPurchase).forEach(stock => {
                const purchaseAmount = monthlyPurchase[stock];
                if (purchaseAmount > 0) {
                    // 只在配息月或每月固定購買
                    let shouldBuy = false;
                    if (stock === "00712") {
                        shouldBuy = true; // 每月固定買入
                    } else if (this.dividendMonths[stock].includes(currentMonth)) {
                        shouldBuy = true; // 配息月買入
                    }
                    
                    if (shouldBuy) {
                        currentStocks[stock] += purchaseAmount;
                        monthlyStockCost += purchaseAmount * currentStockPrices[stock] * 1000; // 每張1000股
                    }
                }
            });
            
            totalStockInvestment += monthlyStockCost;

            // 計算利息和本金
            const monthlyInterest = remainingBalance * monthlyRate;
            let principalPayment = monthlyPayment - monthlyInterest;
            
            // 計算配息
            const monthlyDividends = {};
            let totalMonthlyDividend = 0;
            
            Object.keys(dividends).forEach(stock => {
                if (this.dividendMonths[stock].includes(currentMonth)) {
                    monthlyDividends[stock] = currentStocks[stock] * dividends[stock];
                    totalMonthlyDividend += monthlyDividends[stock];
                } else {
                    monthlyDividends[stock] = 0;
                }
            });

            // 計算實際還款金額
            const totalAvailablePayment = principalPayment + totalMonthlyDividend;
            const actualPayment = Math.min(totalAvailablePayment, remainingBalance);
            const earlyPayment = Math.max(0, actualPayment - principalPayment);
            
            // 更新餘額
            remainingBalance = Math.max(0, remainingBalance - actualPayment);
            
            // 累計統計
            totalInterestPaid += monthlyInterest;
            totalDividendReceived += totalMonthlyDividend;
            totalEarlyPayment += earlyPayment;
            
            // 記錄還清月份
            if (remainingBalance <= 0 && payoffMonth === 0) {
                payoffMonth = month;
            }

            // 儲存月度結果
            results.push({
                month: month,
                year: Math.ceil(month / 12),
                currentMonth: currentMonth,
                principalPayment: Math.min(principalPayment, remainingBalance + actualPayment),
                interestPayment: monthlyInterest,
                totalPayment: actualPayment + monthlyInterest,
                earlyPayment: earlyPayment,
                remainingBalance: remainingBalance,
                stocks: { ...currentStocks },
                stockPrices: { ...currentStockPrices },
                dividends: { ...monthlyDividends },
                totalDividend: totalMonthlyDividend,
                monthlyStockCost: monthlyStockCost,
                totalStockInvestment: totalStockInvestment
            });

            // 每年添加一個圖表數據點
            if (month % 12 === 0) {
                chartData.push({
                    year: Math.ceil(month / 12),
                    balance: remainingBalance / 10000,
                    totalPaid: (loanAmount - remainingBalance) / 10000
                });
            }
            
            // 如果貸款已還清，停止計算
            if (remainingBalance <= 0) {
                // 如果不是年底，添加最終數據點
                if (month % 12 !== 0) {
                    chartData.push({
                        year: Math.ceil(month / 12),
                        balance: 0,
                        totalPaid: loanAmount / 10000
                    });
                }
                break;
            }
        }

        // 如果沒有提前還清，確保payoffMonth有值
        if (payoffMonth === 0) {
            payoffMonth = totalMonths;
        }

        // 計算摘要統計
        const originalTotalPayment = monthlyPayment * totalMonths;
        const actualTotalPayment = loanAmount + totalInterestPaid - totalEarlyPayment;
        const savedAmount = Math.max(0, originalTotalPayment - actualTotalPayment);
        const savedYears = Math.max(0, loanYears - Math.ceil(payoffMonth / 12));

        const summary = {
            originalMonthlyPayment: monthlyPayment,
            payoffMonth: payoffMonth,
            savedYears: savedYears,
            totalInterestPaid: totalInterestPaid,
            totalDividendReceived: totalDividendReceived,
            savedAmount: savedAmount,
            totalStockInvestment: totalStockInvestment,
            finalStocks: currentStocks,
            finalStockPrices: currentStockPrices
        };

        // 更新界面
        this.updateSummaryCards(summary);
        this.updateMonthlyDividendTable(results);
        this.updateDetailTable(results);
    }

    // 更新摘要卡片
    updateSummaryCards(summary) {
        const summaryCards = document.getElementById('summaryCards');
        summaryCards.innerHTML = `
            <div class="summary-card">
                <h3>提前還清時間</h3>
                <div class="value">${Math.ceil(summary.payoffMonth / 12)} 年</div>
                <small>節省 ${summary.savedYears} 年</small>
            </div>
            <div class="summary-card green">
                <h3>總配息收入</h3>
                <div class="value">${this.formatNumber(summary.totalDividendReceived / 10000)} 萬</div>
                <small>${this.formatCurrency(summary.totalDividendReceived)}</small>
            </div>
            <div class="summary-card blue">
                <h3>總股票投資</h3>
                <div class="value">${this.formatNumber(summary.totalStockInvestment / 10000)} 萬</div>
                <small>${this.formatCurrency(summary.totalStockInvestment)}</small>
            </div>
            <div class="summary-card purple">
                <h3>節省利息支出</h3>
                <div class="value">${this.formatNumber(summary.savedAmount / 10000)} 萬</div>
                <small>${this.formatCurrency(summary.savedAmount)}</small>
            </div>
        `;
    }

    // 更新每月配息表格
    updateMonthlyDividendTable(results) {
        const tableContent = document.getElementById('monthlyDividendTable');
        
        // 創建表格標題
        let html = `
            <div class="year-summary-row header">
                <div>年份</div>
                <div>年度總配息</div>
                <div>配息次數</div>
                <div>平均月配息</div>
                <div>操作</div>
            </div>
        `;

        // 按年度匯總配息數據
        const yearlyDividends = {};
        results.forEach(result => {
            if (!yearlyDividends[result.year]) {
                yearlyDividends[result.year] = {
                    totalDividend: 0,
                    dividendCount: 0,
                    months: []
                };
            }
            
            yearlyDividends[result.year].totalDividend += result.totalDividend;
            if (result.totalDividend > 0) {
                yearlyDividends[result.year].dividendCount++;
            }
            yearlyDividends[result.year].months.push(result);
        });

        // 生成年度摘要行
        Object.keys(yearlyDividends).forEach(year => {
            const data = yearlyDividends[year];
            const avgMonthlyDividend = data.totalDividend / 12;
            
            html += `
                <div class="year-summary-row" onclick="toggleYearDetails(${year})">
                    <div class="year-summary-mobile">
                        <div class="year-title">
                            <i class="fas fa-chevron-right expand-icon" id="icon-${year}"></i>
                            第 ${year} 年
                        </div>
                        <div class="year-total">${this.formatCurrency(data.totalDividend)}</div>
                    </div>
                    <div class="year-summary-details">
                        <div>配息次數：${data.dividendCount} 次</div>
                        <div>平均月配息：${this.formatCurrency(avgMonthlyDividend)}</div>
                    </div>
                </div>
                <div class="monthly-details" id="details-${year}">
                    <div class="monthly-detail-header">
                        <div>月份</div>
                        <div>0056</div>
                        <div>00878</div>
                        <div>00712</div>
                        <div>00919</div>
                        <div>總配息</div>
                    </div>
            `;
            
            // 生成該年度的月度明細 - 只顯示有配息的月份
            data.months.forEach(result => {
                const hasDiv = result.totalDividend > 0;
                
                // 只顯示有配息的月份
                if (hasDiv) {
                    html += `
                        <div class="monthly-detail-row dividend-month">
                            <div class="monthly-row-header">
                                <span>${result.currentMonth}月</span>
                                <span class="dividend-amount">
                                    ${this.formatCurrency(result.totalDividend)}
                                </span>
                            </div>
                            <div class="monthly-stocks-grid">
                                <div class="stock-dividend-item ${result.dividends['0056'] > 0 ? 'has-dividend' : ''}">
                                    <span>0056</span>
                                    <span>${result.dividends['0056'] > 0 ? this.formatNumber(result.dividends['0056']) : '-'}</span>
                                </div>
                                <div class="stock-dividend-item ${result.dividends['00878'] > 0 ? 'has-dividend' : ''}">
                                    <span>00878</span>
                                    <span>${result.dividends['00878'] > 0 ? this.formatNumber(result.dividends['00878']) : '-'}</span>
                                </div>
                                <div class="stock-dividend-item ${result.dividends['00712'] > 0 ? 'has-dividend' : ''}">
                                    <span>00712</span>
                                    <span>${result.dividends['00712'] > 0 ? this.formatNumber(result.dividends['00712']) : '-'}</span>
                                </div>
                                <div class="stock-dividend-item ${result.dividends['00919'] > 0 ? 'has-dividend' : ''}">
                                    <span>00919</span>
                                    <span>${result.dividends['00919'] > 0 ? this.formatNumber(result.dividends['00919']) : '-'}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });
            
            html += `</div>`;
        });

        tableContent.innerHTML = html;
    }

    // 更新詳細表格
    updateDetailTable(results) {
        const tableContent = document.getElementById('detailTable');
        
        // 創建表格標題
        let html = `
            <div class="year-row header">
                <div>年份</div>
                <div>本金</div>
                <div>利息</div>
                <div>配息收入</div>
                <div>股票投資</div>
                <div>剩餘本金</div>
                <div>持股總數</div>
                <div>股票價值</div>
            </div>
        `;

        // 按年度匯總數據
        const yearlyData = {};
        results.forEach(result => {
            if (!yearlyData[result.year]) {
                yearlyData[result.year] = {
                    principal: 0,
                    interest: 0,
                    dividend: 0,
                    stockInvestment: 0,
                    lastBalance: 0,
                    lastStocks: {},
                    lastStockPrices: {},
                    totalDividend: 0
                };
            }
            
            const yearly = yearlyData[result.year];
            yearly.principal += result.principalPayment;
            yearly.interest += result.interestPayment;
            yearly.dividend += result.totalDividend;
            yearly.stockInvestment += result.monthlyStockCost;
            yearly.lastBalance = result.remainingBalance;
            yearly.lastStocks = result.stocks;
            yearly.lastStockPrices = result.stockPrices;
            yearly.totalDividend += result.totalDividend;
        });

        // 生成年度摘要行
        Object.keys(yearlyData).forEach(year => {
            const data = yearlyData[year];
            
            // 計算股票總價值
            let totalStockValue = 0;
            let totalShares = 0;
            Object.keys(data.lastStocks).forEach(stock => {
                const shares = data.lastStocks[stock];
                const price = data.lastStockPrices[stock];
                totalShares += shares;
                totalStockValue += shares * price * 1000; // 每張1000股
            });
            
            html += `
                <div class="year-row">
                    <div>第 ${year} 年</div>
                    <div>${this.formatNumber(data.principal)}</div>
                    <div>${this.formatNumber(data.interest)}</div>
                    <div>${this.formatNumber(data.totalDividend)}</div>
                    <div>${this.formatNumber(data.stockInvestment)}</div>
                    <div>${this.formatNumber(data.lastBalance)}</div>
                    <div>${totalShares} 張</div>
                    <div>${this.formatNumber(totalStockValue)}</div>
                </div>
            `;
        });

        tableContent.innerHTML = html;
    }
}

// 初始化計算器
const calculator = new MortgageCalculator();

// 全域計算函數
function calculate() {
    calculator.calculate();
}

// 切換年度詳細資訊顯示
function toggleYearDetails(year) {
    const detailsElement = document.getElementById(`details-${year}`);
    const iconElement = document.getElementById(`icon-${year}`);
    const rowElement = detailsElement.previousElementSibling;
    
    if (detailsElement.classList.contains('expanded')) {
        // 收合
        detailsElement.classList.remove('expanded');
        iconElement.classList.remove('expanded');
        rowElement.classList.remove('expanded');
    } else {
        // 展開
        detailsElement.classList.add('expanded');
        iconElement.classList.add('expanded');
        rowElement.classList.add('expanded');
    }
}

// 頁面載入時執行初始計算
document.addEventListener('DOMContentLoaded', function() {
    calculate();
});
