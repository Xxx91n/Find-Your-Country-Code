// 票 T2（#11）：Angular 20 响应式表单自定义 ControlValueAccessor fixture 应用。
// 自定义 CVA 是最严格的同步面：原生 input 事件必须穿过 CVA 的 registerOnChange
// 回调才能进 FormControl——这证明脚本的原型 value setter + input→change→blur
// 序列在真实 Angular 表单管线上（不只是原生监听）状态真实同步。
// JIT 应用：server.mjs /gen/angular/ 路由用 esbuild 现场 bundle（DI 走 inject()）。
import '@angular/compiler'; // JIT 编译面：bootstrapApplication 的 ɵɵngDeclare 路径必须显式加载
import { Component, ElementRef, HostListener, inject } from '@angular/core';
import {
  ControlValueAccessor,
  FormControl,
  FormGroup,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { bootstrapApplication } from '@angular/platform-browser';

@Component({
  selector: 'fycc-dial-input',
  standalone: true,
  template: `<input id="a-cva-input" name="dialCode" type="text" placeholder="+86" (blur)="handleBlur()">`,
  providers: [
    // useExisting 自引用：legacy decorator 在类绑定完成后才应用，无需 forwardRef
    { provide: NG_VALUE_ACCESSOR, useExisting: CvaDialInput, multi: true },
  ],
})
class CvaDialInput implements ControlValueAccessor {
  private el = inject(ElementRef);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    const input = this.el.nativeElement.querySelector('input');
    if (input) input.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  @HostListener('input', ['$event.target.value'])
  handleInput(value: string): void {
    this.onChange(value);
  }

  // blur 挂内层 input（blur 不冒泡，host 上的监听永远收不到 —— CodeRabbit review 修正）
  handleBlur(): void {
    this.onTouched();
  }
}

@Component({
  selector: 'fycc-cva-root',
  standalone: true,
  imports: [ReactiveFormsModule, CvaDialInput],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <label>国家区号 <fycc-dial-input formControlName="dialCode"></fycc-dial-input></label>
      <input id="a-cva-tel" type="tel" name="phone" placeholder="手机号">
      <button id="a-cva-submit" type="submit">提交</button>
      <pre id="a-cva-state">{{ stateJson }}</pre>
      <pre id="a-cva-touched">{{ dialCodeTouched }}</pre>
      @if (submitted) {<pre id="a-cva-submitted">{{ submitted }}</pre>}
    </form>
  `,
})
class CvaApp {
  form = new FormGroup({ dialCode: new FormControl('') });
  submitted: string | null = null;

  get stateJson(): string {
    return JSON.stringify(this.form.value);
  }

  get dialCodeTouched(): boolean {
    return this.form.get('dialCode')!.touched;
  }

  submit(): void {
    this.submitted = this.stateJson;
  }
}

bootstrapApplication(CvaApp).catch((err) => console.error(err));
