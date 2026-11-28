"""Create a provisional grading copy; never edit original evaluation artifacts."""
import csv
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def main():
    with (ROOT/'eval/run-3.csv').open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f); fields=reader.fieldnames; rows=list(reader)
    failures={'B01','B02','B03','B04','B13'}
    for r in rows:
        r['pass']='0' if r['id'] in failures or r['error'] else '1'
        r['ghi_chu']='NHÁP, chờ người duyệt. '+('Expected local; output unsure vì chưa có review.' if r['id'] in failures else 'Đối chiếu output với pass_criterion; cần người thứ hai kiểm lại.')
        if r['id']=='B16':r['ghi_chu']+=' Chấm theo tiêu chí không khẳng định ngon nhất, không nêu quán sai nhãn; tuy nhiên chưa gợi ý được quán, giá trị sử dụng chưa đạt.'
    path=ROOT/'cp4/results/run-3-graded-draft.csv'
    with path.open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rows)
    print('Draft only:',sum(r['pass']=='1' for r in rows),'/',len(rows),path)
if __name__=='__main__':main()
