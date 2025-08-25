// 存股對沖房貸計算器
class MortgageCalculator {
    constructor() {
        this.dividendMonths = {
            "0056": [1, 4, 7, 10],
            "00878": [2, 5, 8, 11], 
            "0050": [1, 7],
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
        try {
            // 獲取輸入參數並驗證
            const loanAmountElement = document.getElementById('loanAmount');
            const annualRateElement = document.getElementById('interestRate');
            const loanYearsElement = document.getElementById('loanYears');
            
            if (!loanAmountElement || !annualRateElement || !loanYearsElement) {
                console.error('基本輸入元素未找到');
                return;
            }
            
            const loanAmountInput = loanAmountElement.value;
            const annualRateInput = annualRateElement.value;
            const loanYearsInput = loanYearsElement.value;
            
            if (!loanAmountInput || !annualRateInput || !loanYearsInput) {
                alert('請填入所有必要參數');
                return;
            }
            
            this.loanAmount = parseFloat(loanAmountInput) * 10000;
            const annualRate = parseFloat(annualRateInput);
            const loanYears = parseInt(loanYearsInput);
            
            if (isNaN(this.loanAmount) || isNaN(annualRate) || isNaN(loanYears) || 
                this.loanAmount <= 0 || annualRate <= 0 || loanYears <= 0) {
                alert('請輸入有效的數值');
                return;
            }
        
        // 安全獲取股票參數
        const getElementValue = (id, defaultValue = 0, isFloat = false) => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`元素 ${id} 未找到，使用預設值 ${defaultValue}`);
                return defaultValue;
            }
            const value = isFloat ? parseFloat(element.value) : parseInt(element.value);
            return isNaN(value) ? defaultValue : value;
        };

        const initialStocks = {
            "0056": getElementValue('initial0056'),
            "00878": getElementValue('initial00878'),
            "0050": getElementValue('initial0050'),
            "00919": getElementValue('initial00919')
        };
        
        const monthlyPurchase = {
            "0056": getElementValue('monthly0056'),
            "00878": getElementValue('monthly00878'),
            "0050": getElementValue('monthly0050'),
            "00919": getElementValue('monthly00919')
        };
        
        const stockPrices = {
            "0056": getElementValue('price0056', 0, true),
            "00878": getElementValue('price00878', 0, true),
            "0050": getElementValue('price0050', 0, true),
            "00919": getElementValue('price00919', 0, true)
        };
        
        const annualGrowth = {
            "0056": getElementValue('growth0056', 0, true) / 100,
            "00878": getElementValue('growth00878', 0, true) / 100,
            "0050": getElementValue('growth0050', 0, true) / 100,
            "00919": getElementValue('growth00919', 0, true) / 100
        };
        
        const dividends = {
            "0056": getElementValue('div0056', 0, true),
            "00878": getElementValue('div00878', 0, true),
            "0050": getElementValue('div0050', 0, true),
            "00919": getElementValue('div00919', 0, true)
        };

        // 計算基本參數
        const monthlyRate = annualRate / 12 / 100;
        const totalMonths = loanYears * 12;
        const monthlyPayment = this.calculateMonthlyPayment(this.loanAmount, annualRate, loanYears);
        
        // 初始化變數
        let remainingBalance = this.loanAmount;
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
                if (monthlyPurchase[stock] > 0) {
                    const cost = monthlyPurchase[stock] * currentStockPrices[stock]; // 直接以股數計算
                    monthlyStockCost += cost;
                    totalStockInvestment += cost;
                    currentStocks[stock] += monthlyPurchase[stock];
                }
            });

            // 計算利息和本金
            const monthlyInterest = remainingBalance * monthlyRate;
            let principalPayment = monthlyPayment - monthlyInterest;
            
            // 檢查配息投資策略選項
            const strategyRadios = document.querySelectorAll('input[name="dividendStrategy"]');
            let selectedStrategy = 'mortgage'; // 預設值
            strategyRadios.forEach(radio => {
                if (radio.checked) {
                    selectedStrategy = radio.value;
                }
            });

            // 計算配息
            const monthlyDividends = {};
            let totalMonthlyDividend = 0;
            let highDividendETFDividend = 0; // 高股息ETF配息 (0056, 00878, 00919)
            let etf0050Dividend = 0; // 0050配息
            
            Object.keys(dividends).forEach(stock => {
                if (this.dividendMonths[stock] && this.dividendMonths[stock].includes(currentMonth)) {
                    monthlyDividends[stock] = currentStocks[stock] * dividends[stock];
                    totalMonthlyDividend += monthlyDividends[stock];
                    
                    // 分類配息來源
                    if (stock === '0050') {
                        etf0050Dividend += monthlyDividends[stock];
                    } else {
                        highDividendETFDividend += monthlyDividends[stock];
                    }
                } else {
                    monthlyDividends[stock] = 0;
                }
            });

            // 處理配息投資策略
            let dividendForMortgage = totalMonthlyDividend; // 用於還房貸的配息
            let dividendFor0050Investment = 0; // 用於投資0050的配息
            
            if (selectedStrategy === 'full0050') {
                // 策略1：配息完全投入0050股數
                dividendFor0050Investment = totalMonthlyDividend;
                dividendForMortgage = 0;
                
                // 計算可購買的0050股數
                const price0050 = currentStockPrices['0050'];
                if (price0050 > 0 && dividendFor0050Investment > 0) {
                    const shares0050ToBuy = Math.floor(dividendFor0050Investment / price0050);
                    if (shares0050ToBuy > 0) {
                        currentStocks['0050'] += shares0050ToBuy;
                        const actualInvestment = shares0050ToBuy * price0050;
                        totalStockInvestment += actualInvestment;
                        // 剩餘的配息仍用於還房貸
                        dividendForMortgage = dividendFor0050Investment - actualInvestment;
                    }
                }
            } else if (selectedStrategy === 'afterMortgage') {
                // 策略2：配息扣掉房貸後，餘額投入0050
                const mortgagePayment = Math.min(totalMonthlyDividend, principalPayment);
                dividendForMortgage = mortgagePayment;
                dividendFor0050Investment = totalMonthlyDividend - mortgagePayment;
                
                // 計算可購買的0050股數
                const price0050 = currentStockPrices['0050'];
                if (price0050 > 0 && dividendFor0050Investment > 0) {
                    const shares0050ToBuy = Math.floor(dividendFor0050Investment / price0050);
                    if (shares0050ToBuy > 0) {
                        currentStocks['0050'] += shares0050ToBuy;
                        const actualInvestment = shares0050ToBuy * price0050;
                        totalStockInvestment += actualInvestment;
                        // 剩餘的配息加回房貸還款
                        dividendForMortgage += (dividendFor0050Investment - actualInvestment);
                    }
                }
            }
            // 預設策略 (mortgage)：配息用於還房貸，無需額外處理
            
            // 計算實際還款金額（本金 + 配息）
            const actualPayment = principalPayment + dividendForMortgage;
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
                monthlyDividends: { ...monthlyDividends },
                totalDividend: totalMonthlyDividend,
                monthlyStockCost: monthlyStockCost,
                totalStockInvestment: totalStockInvestment,
                dividendStrategy: selectedStrategy,
                dividendFor0050Investment: dividendFor0050Investment || 0,
                dividendForMortgage: dividendForMortgage || totalMonthlyDividend
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
                        totalPaid: this.loanAmount / 10000
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
        const actualTotalPayment = this.loanAmount + totalInterestPaid - totalEarlyPayment;
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

        // 按年度匯總數據
        const yearlyResults = this.aggregateYearlyData(results);
        
        // 更新界面
        this.updateSummaryCards(summary);
        this.updateMonthlyDividendTable(results);
        this.updateDetailTable(yearlyResults);
        
        } catch (error) {
            console.error('計算錯誤:', error);
            console.error('錯誤堆疊:', error.stack);
            alert('計算過程中發生錯誤: ' + error.message);
        }
    }

    // 按年度匯總數據
    aggregateYearlyData(results) {
        const yearlyData = {};
        
        results.forEach(result => {
            const year = result.year;
            if (!yearlyData[year]) {
                yearlyData[year] = {
                    year: year,
                    yearInterest: 0,
                    yearPrincipal: 0,
                    totalDividend: 0,
                    extraPayment: 0,
                    actualPayment: 0,
                    remainingBalance: 0
                };
            }
            
            yearlyData[year].yearInterest += result.interestPayment;
            yearlyData[year].yearPrincipal += result.principalPayment;
            yearlyData[year].totalDividend += result.totalDividend;
            yearlyData[year].extraPayment += result.earlyPayment;
            yearlyData[year].actualPayment += result.totalPayment;
            
            // 使用年底的餘額
            if (result.currentMonth === 12 || result.remainingBalance === 0) {
                yearlyData[year].remainingBalance = result.remainingBalance;
            }
        });
        
        return Object.values(yearlyData);
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
                        <div>0050</div>
                        <div>00919</div>
                        <div>總配息</div>
                        <div>總市值</div>
                    </div>
            `;
            
            // 生成該年度的月度明細 - 只顯示有配息的月份
            data.months.forEach(result => {
                const hasDiv = result.totalDividend > 0;
                
                // 只顯示有配息的月份
                if (hasDiv) {
                    // 計算總市值
                    let totalMarketValue = 0;
                    Object.keys(result.stocks).forEach(stock => {
                        totalMarketValue += result.stocks[stock] * result.stockPrices[stock]; // 直接以股數計算
                    });

                    html += `
                        <div class="monthly-detail-row dividend-month">
                            <div>${result.currentMonth}月</div>
                            <div class="${result.monthlyDividends['0056'] > 0 ? 'dividend-amount' : 'no-dividend'}">
                                ${result.monthlyDividends['0056'] > 0 ? this.formatNumber(result.monthlyDividends['0056']) : '-'}
                                <br><small style="color: #666; font-size: 0.8em;">
                                    ${this.formatNumber(result.stocks['0056'])}股 × $${result.stockPrices['0056'].toFixed(1)}
                                </small>
                            </div>
                            <div class="${result.monthlyDividends['00878'] > 0 ? 'dividend-amount' : 'no-dividend'}">
                                ${result.monthlyDividends['00878'] > 0 ? this.formatNumber(result.monthlyDividends['00878']) : '-'}
                                <br><small style="color: #666; font-size: 0.8em;">
                                    ${this.formatNumber(result.stocks['00878'])}股 × $${result.stockPrices['00878'].toFixed(1)}
                                </small>
                            </div>
                            <div class="${result.monthlyDividends['0050'] > 0 ? 'dividend-amount' : 'no-dividend'}">
                                ${result.monthlyDividends['0050'] > 0 ? this.formatNumber(result.monthlyDividends['0050']) : '-'}
                                <br><small style="color: #666; font-size: 0.8em;">
                                    ${this.formatNumber(result.stocks['0050'])}股 × $${result.stockPrices['0050'].toFixed(1)}
                                </small>
                            </div>
                            <div class="${result.monthlyDividends['00919'] > 0 ? 'dividend-amount' : 'no-dividend'}">
                                ${result.monthlyDividends['00919'] > 0 ? this.formatNumber(result.monthlyDividends['00919']) : '-'}
                                <br><small style="color: #666; font-size: 0.8em;">
                                    ${this.formatNumber(result.stocks['00919'])}股 × $${result.stockPrices['00919'].toFixed(1)}
                                </small>
                            </div>
                            <div class="dividend-amount">
                                ${this.formatCurrency(result.totalDividend)}
                                ${result.dividendStrategy !== 'mortgage' && result.dividendFor0050Investment > 0 ? 
                                    `<br><small style="color: #28a745; font-size: 0.8em;">
                                        <i class="fas fa-sync-alt"></i> ${this.formatCurrency(result.dividendFor0050Investment)} → 0050
                                    </small>` : ''}
                            </div>
                            <div class="market-value" style="font-weight: bold; color: #2196f3;">
                                ${this.formatCurrency(totalMarketValue)}
                                <br><small style="color: #666; font-size: 0.8em;">
                                    ${this.formatNumber(totalMarketValue / 10000)}萬
                                </small>
                            </div>
                            
                            <!-- 手機版布局 -->
                            <div class="monthly-row-header" style="display: none;">
                                <span>${result.currentMonth}月</span>
                                <span class="dividend-amount">
                                    ${this.formatCurrency(result.totalDividend)}
                                </span>
                            </div>
                            <div class="monthly-stocks-grid" style="display: none;">
                                <div class="stock-dividend-item ${result.monthlyDividends['0056'] > 0 ? 'has-dividend' : ''}">
                                    <span>0056 (${result.stocks['0056']}張)</span>
                                    <span>${result.monthlyDividends['0056'] > 0 ? this.formatNumber(result.monthlyDividends['0056']) : '-'}</span>
                                </div>
                                <div class="stock-dividend-item ${result.monthlyDividends['00878'] > 0 ? 'has-dividend' : ''}">
                                    <span>00878 (${result.stocks['00878']}張)</span>
                                    <span>${result.monthlyDividends['00878'] > 0 ? this.formatNumber(result.monthlyDividends['00878']) : '-'}</span>
                                </div>
                                <div class="stock-dividend-item ${result.monthlyDividends['0050'] > 0 ? 'has-dividend' : ''}">
                                    <span>0050 (${result.stocks['0050']}張)</span>
                                    <span>${result.monthlyDividends['0050'] > 0 ? this.formatNumber(result.monthlyDividends['0050']) : '-'}</span>
                                </div>
                                <div class="stock-dividend-item ${result.monthlyDividends['00919'] > 0 ? 'has-dividend' : ''}">
                                    <span>00919 (${result.stocks['00919']}張)</span>
                                    <span>${result.monthlyDividends['00919'] > 0 ? this.formatNumber(result.monthlyDividends['00919']) : '-'}</span>
                                </div>
                            </div>
                            <div class="monthly-total" style="display: none;">
                                總市值: ${this.formatCurrency(totalMarketValue)} (${this.formatNumber(totalMarketValue / 10000)}萬)
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
                <div>剩餘本金 (萬元)</div>
                <div>年利息 (萬元)</div>
                <div>年本金 (萬元)</div>
                <div>年配息 (萬元)</div>
                <div>額外還款 (萬元)</div>
                <div>實際還款 (萬元)</div>
                <div>進度</div>
            </div>
        `;

        let totalInterest = 0;
        let totalPrincipal = 0;
        let totalDividend = 0;
        let totalExtraPayment = 0;

        results.forEach(result => {
            totalInterest += result.yearInterest;
            totalPrincipal += result.yearPrincipal;
            totalDividend += result.totalDividend;
            totalExtraPayment += result.extraPayment;

            const progress = ((this.loanAmount - result.remainingBalance) / this.loanAmount * 100).toFixed(1);
            
            html += `
                <div class="year-row">
                    <div>第${result.year}年</div>
                    <div>${this.formatNumber(result.remainingBalance / 10000)}</div>
                    <div>${this.formatNumber(result.yearInterest / 10000)}</div>
                    <div>${this.formatNumber(result.yearPrincipal / 10000)}</div>
                    <div>${this.formatNumber(result.totalDividend / 10000)}</div>
                    <div>${this.formatNumber(result.extraPayment / 10000)}</div>
                    <div>${this.formatNumber(result.actualPayment / 10000)}</div>
                    <div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        ${progress}%
                    </div>
                </div>
                
                <div class="year-row" style="display: none;">
                    <div class="year-row-mobile">
                        <span>第${result.year}年</span>
                        <span>剩餘: ${this.formatNumber(result.remainingBalance / 10000)}萬</span>
                    </div>
                    <div class="year-details-grid">
                        <div class="year-detail-item">
                            <span>年利息</span>
                            <span>${this.formatNumber(result.yearInterest / 10000)}萬</span>
                        </div>
                        <div class="year-detail-item">
                            <span>年本金</span>
                            <span>${this.formatNumber(result.yearPrincipal / 10000)}萬</span>
                        </div>
                        <div class="year-detail-item">
                            <span>年配息</span>
                            <span>${this.formatNumber(result.totalDividend / 10000)}萬</span>
                        </div>
                        <div class="year-detail-item">
                            <span>額外還款</span>
                            <span>${this.formatNumber(result.extraPayment / 10000)}萬</span>
                        </div>
                        <div class="year-detail-item">
                            <span>實際還款</span>
                            <span>${this.formatNumber(result.actualPayment / 10000)}萬</span>
                        </div>
                        <div class="year-detail-item">
                            <span>還款進度</span>
                            <span>${progress}%</span>
                        </div>
                    </div>
                    <div class="progress-bar" style="margin-top: 8px;">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
        });

        // 總計行
        html += `
            <div class="year-row total" style="background: #e9ecef; border: 2px solid #495057;">
                <div class="year-row-mobile">
                    <span style="font-weight: bold; color: #495057;">總計</span>
                    <span style="font-weight: bold; color: #495057;">100%完成</span>
                </div>
                <div class="year-details-grid">
                    <div class="year-detail-item" style="background: #dee2e6;">
                        <span>總利息</span>
                        <span>${this.formatNumber(totalInterest)}萬</span>
                    </div>
                    <div class="year-detail-item" style="background: #dee2e6;">
                        <span>總本金</span>
                        <span>${this.formatNumber(totalPrincipal)}萬</span>
                    </div>
                    <div class="year-detail-item" style="background: #dee2e6;">
                        <span>總配息</span>
                        <span>${this.formatCurrency(totalDividend)}</span>
                    </div>
                    <div class="year-detail-item" style="background: #dee2e6;">
                        <span>總額外還款</span>
                        <span>${this.formatNumber(totalExtraPayment)}萬</span>
                    </div>
                    <div class="year-detail-item" style="background: #dee2e6;">
                        <span>總還款</span>
                        <span>${this.formatNumber(totalPrincipal + totalInterest)}萬</span>
                    </div>
                </div>
            </div>
        `;

        tableContent.innerHTML = html;
    }
}

// 初始化計算器
var calculator = new MortgageCalculator();

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

// 配息投資策略選項處理
function handleDividendStrategyChange() {
    // 重新計算
    calculate();
}

// 頁面載入時執行初始計算
document.addEventListener('DOMContentLoaded', function() {
    // 設置策略選項事件監聽器
    const strategyRadios = document.querySelectorAll('input[name="dividendStrategy"]');
    strategyRadios.forEach(radio => {
        radio.addEventListener('change', handleDividendStrategyChange);
    });
    
    calculate();
});
