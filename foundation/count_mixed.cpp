// Exact enumeration of maximal independent sets in K2 x K2 x Kq3 x Kq4.
// The 2x2 (coordinate 1,2) cells each hold a matching in K_{q3,q4}.
// Build: g++ -O3 -march=native -o count_mixed count_mixed.cpp
// Usage: ./count_mixed q3 q4
#include <bits/stdc++.h>
using namespace std;
struct M { uint32_t edges, holes; uint8_t sz; };

static vector<M> make_matchings(int qL, int qR) {
    vector<M> ms;
    function<void(int,uint32_t,uint32_t,uint32_t,int)> rec =
        [&](int L, uint32_t usedR, uint32_t e, uint32_t usedL, int cnt) {
            if (L == qL) {
                uint32_t holes = 0;
                for (int l = 0; l < qL; ++l) if (!(usedL >> l & 1))
                    for (int r = 0; r < qR; ++r) if (!(usedR >> r & 1))
                        holes |= 1u << (l * qR + r);
                ms.push_back({e, holes, (uint8_t)cnt});
                return;
            }
            rec(L + 1, usedR, e, usedL, cnt);
            for (int r = 0; r < qR; ++r) if (!(usedR >> r & 1))
                rec(L + 1, usedR | (1u << r), e | (1u << (L * qR + r)),
                    usedL | (1u << L), cnt + 1);
        };
    rec(0, 0, 0, 0, 0);
    sort(ms.begin(), ms.end(), [](const M& a, const M& b) { return a.edges < b.edges; });
    ms.erase(unique(ms.begin(), ms.end(), [](const M& a, const M& b) {
        return a.edges == b.edges;
    }), ms.end());
    return ms;
}

int main(int argc, char** argv) {
    if (argc != 3) { cerr << "usage: count_mixed q3 q4\n"; return 2; }
    int q3 = atoi(argv[1]), q4 = atoi(argv[2]);
    auto ms = make_matchings(q3, q4);
    int m = (int)ms.size();
    if (m > 200000) { cerr << "refusing: too many matchings " << m << "\n"; return 3; }
    map<int, unsigned long long> cnt;
    unsigned long long total = 0;
    for (int A = 0; A < m; ++A) for (int B = 0; B < m; ++B) {
        if (ms[A].edges & ms[B].edges) continue;
        for (int C = 0; C < m; ++C) {
            if (ms[A].edges & ms[C].edges) continue;
            uint32_t eBC = ms[B].edges | ms[C].edges;
            if (ms[A].holes & ~eBC) continue;
            for (int D = 0; D < m; ++D) {
                if (ms[B].edges & ms[D].edges) continue;
                if (ms[C].edges & ms[D].edges) continue;
                uint32_t eAD = ms[A].edges | ms[D].edges;
                if (ms[B].holes & ~eAD) continue;
                if (ms[C].holes & ~eAD) continue;
                if (ms[D].holes & ~eBC) continue;
                int k = ms[A].sz + ms[B].sz + ms[C].sz + ms[D].sz;
                ++cnt[k]; ++total;
            }
        }
    }
    cout << "{\"q1\":2,\"q2\":2,\"q3\":" << q3 << ",\"q4\":" << q4
         << ",\"matchings\":" << m << ",\"total\":" << total << ",\"counts\":{";
    bool first = true;
    for (auto &[k, v] : cnt) {
        if (!first) cout << ",";
        first = false;
        cout << "\"" << k << "\":" << v;
    }
    cout << "}}\n";
    return 0;
}
