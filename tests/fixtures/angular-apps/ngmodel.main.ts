// 票 T2（#11）：Angular 20 模板驱动 ngModel fixture 应用 —— 与 tests/fixtures/framework-react.html
// 同构（受控 select + 受控 input + 提交回读），验证原生事件序列能同步进 Angular 组件状态。
// JIT 应用：server.mjs /gen/angular/ 路由用 esbuild 现场 bundle（esbuild 不支持
// emitDecoratorMetadata，DI 一律走 inject()；装饰器经 experimentalDecorators 降级，JIT 可编译）。
import '@angular/compiler'; // JIT 编译面：bootstrapApplication 的 ɵɵngDeclare 路径必须显式加载
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { bootstrapApplication } from '@angular/platform-browser';

@Component({
  selector: 'fycc-ngmodel-root',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form (ngSubmit)="submit()">
      <label>国家区号
        <select id="a-select" name="countryCode" [(ngModel)]="code">
          <option value="">选择…</option>
          <option value="+86">+86</option>
          <option value="+81">+81</option>
          <option value="+1">+1</option>
        </select>
      </label>
      <input id="a-input" name="dialCode" type="text" placeholder="+86" [(ngModel)]="phone">
      <input id="a-tel" type="tel" name="phone" placeholder="手机号">
      <button id="a-submit" type="submit">提交</button>
      <pre id="a-state">{{ stateJson }}</pre>
      @if (submitted) {<pre id="a-submitted">{{ submitted }}</pre>}
    </form>
  `,
})
class NgModelApp {
  code = '';
  phone = '';
  submitted: string | null = null;

  get stateJson(): string {
    return JSON.stringify({ code: this.code, phone: this.phone });
  }

  submit(): void {
    this.submitted = this.stateJson;
  }
}

bootstrapApplication(NgModelApp).catch((err) => console.error(err));
